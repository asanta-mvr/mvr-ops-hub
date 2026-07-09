// Guesty Open API client.
//
// Credentials are sourced from the environment variables GUESTY_CLIENT_ID /
// GUESTY_CLIENT_SECRET (the source of truth). The `GuestyConnection` row is
// kept only to cache the access token and track sync state/status; it is
// auto-provisioned from the env credentials when missing.
//
// Auth is OAuth 2.0 client-credentials. Guesty hard-caps token minting at
// 5 tokens / 24h per key, so `getValidToken` caches the bearer token on the
// `GuestyConnection` row and reuses it until it is within 5 min of expiry —
// never minting on every call.
//
// Listings are pulled in TWO passes for guaranteed completeness:
//   1. paginate GET /v1/listings (max limit=100) to collect every listing _id
//   2. fetch each listing's FULL object via GET /v1/listings/{id}
// We never send a `fields` whitelist, so the stored payload is 100% of what
// Guesty returns — including any fields they add in the future. The complete
// object is persisted verbatim to `GuestyListing.raw`; the typed columns are
// projections of it (see `projectListing`).
//
// Request rate limits (shared across tokens): 15/sec, 120/min, 5000/hr. The
// detail pass is throttled with a global pacer + bounded concurrency, and any
// 429 is retried honoring the `Retry-After` header.
import type { GuestyConnection } from '@prisma/client'
import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/auth/crypto'

const GUESTY_BASE = 'https://open-api.guesty.com'
const KEY_ENV = 'INTEGRATION_SECRET_KEY'

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000 // re-mint if <5 min of life left
const PAGE_SIZE = 100 // Guesty max page size for /v1/listings
const DETAIL_CONCURRENCY = 4 // parallel detail fetches
const REQUEST_SPACING_MS = 550 // global pacing → ~109 req/min (under the 120/min cap)
const MAX_429_RETRIES = 5

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── token management ────────────────────────────────────────────────────────

export interface GuestyToken {
  accessToken: string
  expiresAt: Date
}

/** Exchange client credentials for a fresh access token. */
export async function fetchAccessToken(clientId: string, clientSecret: string): Promise<GuestyToken> {
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    scope: 'open-api',
    client_id: clientId,
    client_secret: clientSecret,
  })

  const res = await fetch(`${GUESTY_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Guesty token request failed (${res.status}): ${text.slice(0, 300)}`)
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) {
    throw new Error('Guesty token response did not include an access_token')
  }

  const expiresInMs = (json.expires_in ?? 86400) * 1000
  return { accessToken: json.access_token, expiresAt: new Date(Date.now() + expiresInMs) }
}

export interface GuestyCredentials {
  clientId: string
  clientSecret: string
}

/**
 * Credentials from environment variables (the source of truth). Returns null
 * only if either var is missing.
 */
export function getEnvCredentials(): GuestyCredentials | null {
  const clientId = process.env.GUESTY_CLIENT_ID
  const clientSecret = process.env.GUESTY_CLIENT_SECRET
  if (clientId && clientSecret) return { clientId, clientSecret }
  return null
}

/** True when credentials are supplied via environment variables. */
export function isEnvManaged(): boolean {
  return getEnvCredentials() !== null
}

/**
 * Resolve the credentials to use for a connection: env vars take precedence;
 * otherwise fall back to the (encrypted) values stored on the row.
 */
export function resolveCredentials(connection: GuestyConnection): GuestyCredentials {
  const env = getEnvCredentials()
  if (env) return env
  if (!connection.clientId || !connection.clientSecret) {
    throw new Error('No Guesty credentials configured (set GUESTY_CLIENT_ID / GUESTY_CLIENT_SECRET)')
  }
  return { clientId: connection.clientId, clientSecret: decryptSecret(connection.clientSecret, KEY_ENV) }
}

/**
 * Return the singleton connection row, auto-provisioning one from env
 * credentials if none exists yet. Returns null only when there is neither a
 * stored connection nor env credentials.
 */
export async function getOrCreateConnection(): Promise<GuestyConnection | null> {
  const existing = await db.guestyConnection.findFirst({ orderBy: { createdAt: 'asc' } })
  if (existing) return existing

  const env = getEnvCredentials()
  if (!env) return null

  return db.guestyConnection.create({
    data: { name: 'Guesty', clientId: env.clientId, clientSecret: '', status: 'disconnected' },
  })
}

// Cached-token storage. Encrypts at rest when INTEGRATION_SECRET_KEY is set;
// otherwise stores the token plainly (prefixed so we know how to read it back).
function storeToken(plain: string): string {
  if (process.env[KEY_ENV]) return `enc:${encryptSecret(plain, KEY_ENV)}`
  return `raw:${plain}`
}
function readStoredToken(stored: string): string {
  if (stored.startsWith('enc:')) return decryptSecret(stored.slice(4), KEY_ENV)
  if (stored.startsWith('raw:')) return stored.slice(4)
  return decryptSecret(stored, KEY_ENV) // legacy value written before prefixing
}

/**
 * Return a usable bearer token for the connection. Reuses the cached token
 * while it has >5 min of life left; otherwise mints a new one (from env/DB
 * credentials) and caches it — protecting the 5-tokens/24h cap.
 */
export async function getValidToken(connection: GuestyConnection): Promise<string> {
  if (
    connection.accessToken &&
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() - Date.now() > TOKEN_REFRESH_WINDOW_MS
  ) {
    return readStoredToken(connection.accessToken)
  }

  const { clientId, clientSecret } = resolveCredentials(connection)
  const token = await fetchAccessToken(clientId, clientSecret)

  await db.guestyConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: storeToken(token.accessToken),
      tokenExpiresAt: token.expiresAt,
    },
  })

  return token.accessToken
}

// ─── request helper ──────────────────────────────────────────────────────────

async function guestyGet<T>(token: string, path: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GUESTY_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })

    if (res.status === 429 && attempt < MAX_429_RETRIES) {
      const retryAfter = Number(res.headers.get('retry-after')) || 2
      await sleep(retryAfter * 1000)
      continue
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Guesty GET ${path} failed (${res.status}): ${text.slice(0, 300)}`)
    }

    return (await res.json()) as T
  }
}

/** Global pacer: hands out request slots spaced `spacingMs` apart. */
function makePacer(spacingMs: number): () => Promise<void> {
  let next = 0
  return async function pace() {
    const now = Date.now()
    const wait = Math.max(0, next - now)
    next = Math.max(now, next) + spacingMs
    if (wait > 0) await sleep(wait)
  }
}

// ─── listings ────────────────────────────────────────────────────────────────

interface ListingsPage {
  results?: Array<Record<string, unknown>>
  count?: number
  total?: number
  limit?: number
  skip?: number
}

type RawListing = Record<string, unknown>

/** Paginate the list endpoint (no `fields` param) and collect every listing _id. */
export async function fetchAllListingIds(token: string): Promise<string[]> {
  const ids: string[] = []
  let skip = 0

  for (;;) {
    const page = await guestyGet<ListingsPage>(token, `/v1/listings?limit=${PAGE_SIZE}&skip=${skip}`)
    const results = page.results ?? []

    for (const r of results) {
      const id = typeof r._id === 'string' ? r._id : null
      if (id) ids.push(id)
    }

    const total = page.total ?? page.count ?? results.length
    skip += PAGE_SIZE
    if (results.length === 0 || skip >= total) break
  }

  return ids
}

/** Fetch a single listing's complete object (no `fields` param). */
export async function fetchListingDetail(token: string, id: string): Promise<RawListing> {
  return guestyGet<RawListing>(token, `/v1/listings/${encodeURIComponent(id)}`)
}

/**
 * Two-pass pull: collect all IDs, then fetch each full listing through a
 * throttled, bounded-concurrency runner. Returns the complete raw objects.
 */
export async function fetchAllListingsFull(token: string): Promise<RawListing[]> {
  const ids = await fetchAllListingIds(token)
  const out: RawListing[] = []
  const pace = makePacer(REQUEST_SPACING_MS)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < ids.length) {
      const id = ids[cursor++]
      await pace()
      out.push(await fetchListingDetail(token, id))
    }
  }

  const workerCount = Math.min(DETAIL_CONCURRENCY, ids.length)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))

  return out
}

// ─── projection (raw → typed columns) ────────────────────────────────────────

export interface ProjectedListing {
  guestyId: string
  title: string | null
  nickname: string | null
  propertyType: string | null
  addressFull: string | null
  accommodates: number | null
  bedrooms: number | null
  bathrooms: number | null
  active: boolean | null
  pictureUrl: string | null
  createdAtGuesty: Date | null
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}
function asBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null
}
function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}
function asDate(v: unknown): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}

/** Extract the Guesty _id from a raw listing, or null if absent. */
export function getListingId(raw: RawListing): string | null {
  return asString(raw._id)
}

/**
 * Map a full raw Guesty listing to the typed `GuestyListing` columns. Pure —
 * `raw` remains the source of truth; this only feeds fast display/search.
 */
export function projectListing(raw: RawListing): ProjectedListing | null {
  const guestyId = getListingId(raw)
  if (!guestyId) return null

  const address = asRecord(raw.address)
  const picture = asRecord(raw.picture)
  const pictures = Array.isArray(raw.pictures) ? raw.pictures : []
  const firstPic = asRecord(pictures[0])

  const pictureUrl =
    asString(picture?.thumbnail) ??
    asString(picture?.regular) ??
    asString(picture?.large) ??
    asString(firstPic?.thumbnail) ??
    asString(firstPic?.original) ??
    null

  return {
    guestyId,
    title: asString(raw.title),
    nickname: asString(raw.nickname),
    propertyType: asString(raw.propertyType) ?? asString(raw.type),
    addressFull: asString(address?.full),
    accommodates: asNumber(raw.accommodates),
    bedrooms: asNumber(raw.bedrooms),
    bathrooms: asNumber(raw.bathrooms),
    active: asBool(raw.active),
    pictureUrl,
    createdAtGuesty: asDate(raw.createdAt),
  }
}

// ─── owners ────────────────────────────────────────────────────────────────

type RawOwner = Record<string, unknown>

interface OwnersPage {
  results?: RawOwner[]
  count?: number
  total?: number
}

/**
 * Collect every owner's full object from GET /v1/owners.
 *
 * IMPORTANT: unlike /v1/listings (which returns a `{ results, total }`
 * envelope), the owners endpoint returns a BARE ARRAY and does not appear to
 * honour `limit`/`skip` (it returns the full list on every call). We therefore
 * normalize either shape and dedupe by `_id`, stopping as soon as a page adds
 * nothing new — which terminates cleanly whether or not the endpoint paginates.
 */
export async function fetchAllOwners(token: string): Promise<RawOwner[]> {
  const out: RawOwner[] = []
  const seen = new Set<string>()
  let skip = 0

  for (;;) {
    const body = await guestyGet<RawOwner[] | OwnersPage>(token, `/v1/owners?limit=${PAGE_SIZE}&skip=${skip}`)
    const arr = Array.isArray(body) ? body : (body.results ?? [])
    if (arr.length === 0) break

    let added = 0
    for (const o of arr) {
      const id = typeof o._id === 'string' ? o._id : null
      const key = id ?? JSON.stringify(o)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(o)
        added += 1
      }
    }

    // Non-paginated response repeats the full list → no new ids → stop.
    // A short page also means we've reached the end.
    if (added === 0 || arr.length < PAGE_SIZE) break
    skip += PAGE_SIZE
  }

  return out
}

export interface ProjectedOwner {
  guestyId: string
  fullName: string | null
  email: string | null
  phone: string | null
  ownerType: string | null
  accountId: string | null
  pictureUrl: string | null
  listingCount: number | null
  createdAtGuesty: Date | null
}

/** Best-effort first non-empty string across a few candidate keys. */
function firstString(raw: RawOwner, keys: string[]): string | null {
  for (const k of keys) {
    const v = asString(raw[k])
    if (v) return v
  }
  return null
}

/**
 * Map a raw Guesty owner to typed columns. `raw` remains the source of truth;
 * this only feeds fast display/search and the auto-match heuristic.
 */
export function projectOwner(raw: RawOwner): ProjectedOwner | null {
  const guestyId = asString(raw._id)
  if (!guestyId) return null

  const first = asString(raw.firstName)
  const last = asString(raw.lastName)
  const fullName =
    asString(raw.fullName) ?? ([first, last].filter(Boolean).join(' ').trim() || null)

  // listings may arrive as an array of ids/objects or a count field.
  const listings = raw.listings ?? raw.listingIds ?? raw.assignedListings
  const listingCount = Array.isArray(listings)
    ? listings.length
    : asNumber(raw.listingsCount) ?? asNumber(raw.listingCount)

  return {
    guestyId,
    fullName: fullName || null,
    email: firstString(raw, ['email', 'primaryEmail']),
    phone: firstString(raw, ['phone', 'primaryPhone', 'mobile']),
    ownerType: firstString(raw, ['type', 'ownerType']),
    accountId: asString(raw.accountId),
    pictureUrl: firstString(raw, ['pictureUrl', 'picture', 'photo']),
    listingCount,
    createdAtGuesty: asDate(raw.createdAt),
  }
}

// ─── projection: raw → Data Master Listing ───────────────────────────────────

export interface DataMasterListingFields {
  name: string
  nickname: string | null
  sqrFeet: number | null
  totalOccupancy: number | null
  liveDate: Date | null
  urlAirbnb: string | null
  urlBooking: string | null
  urlVrbo: string | null
}

/** Derive per-channel public URLs from the listing's `integrations[]`. */
function otaUrls(raw: RawListing): { airbnb: string | null; vrbo: string | null; booking: string | null } {
  const integrations = Array.isArray(raw.integrations) ? raw.integrations : []
  let airbnb: string | null = null
  let vrbo: string | null = null
  let booking: string | null = null

  for (const it of integrations) {
    const rec = asRecord(it)
    if (!rec) continue

    const airbnb2 = asRecord(rec.airbnb2)
    const airbnbId = airbnb2 ? asString(airbnb2.id) : null
    if (airbnbId && !airbnb) airbnb = `https://www.airbnb.com/rooms/${airbnbId}`

    // externalUrl is typically the Vrbo/HomeAway public listing URL.
    const ext = asString(rec.externalUrl)
    if (ext && /vrbo|homeaway/i.test(ext) && !vrbo) vrbo = ext

    const bookingCom = asRecord(rec.bookingCom)
    const bookingId = bookingCom ? (asString(bookingCom.id) ?? (asNumber(bookingCom.id) != null ? String(bookingCom.id) : null)) : null
    if (bookingId && !booking) booking = `https://www.booking.com/hotel/${bookingId}.html`
  }

  return { airbnb, vrbo, booking }
}

/**
 * Project a raw Guesty listing into the editable Data Master `Listing` columns
 * (the B.2 mapping in docs/guesty-listing-api-map.md). The Guesty `raw` payload
 * remains the source of truth for read-only detail; this only seeds the
 * structured Data Master record created on push.
 */
export function projectListingToDataMaster(raw: RawListing): DataMasterListingFields {
  const { airbnb, vrbo, booking } = otaUrls(raw)
  return {
    name: asString(raw.nickname) ?? asString(raw.title) ?? 'Untitled listing',
    nickname: asString(raw.nickname),
    sqrFeet: asNumber(raw.areaSquareFeet),
    totalOccupancy: asNumber(raw.accommodates),
    liveDate: asDate(raw.importedAt) ?? asDate(raw.createdAt),
    urlAirbnb: airbnb,
    urlBooking: booking,
    urlVrbo: vrbo,
  }
}

// ─── projection: raw → Unit baseline (COMPARISON ONLY) ───────────────────────

// The Guesty-derived equivalents of the Unit's structural fields. This is used
// ONLY to render the "Guesty side" of the onboarding-cockpit comparison — the
// Unit (Data Master) stays the source of truth and is NEVER auto-overwritten.
export interface UnitBaselineFromGuesty {
  bedrooms: number | null
  bathrooms: number | null
  capacity: number | null
  totalBeds: number | null
  sqft: number | null
  kings: number
  queens: number
  twins: number
  propertyType: string | null
}

/** Aggregate bed counts by type across all rooms in `listingRooms[].beds[]`. */
function bedComposition(raw: RawListing): { kings: number; queens: number; twins: number } {
  let kings = 0
  let queens = 0
  let twins = 0
  const rooms = Array.isArray(raw.listingRooms) ? raw.listingRooms : []
  for (const room of rooms) {
    const r = asRecord(room)
    const beds = r && Array.isArray(r.beds) ? r.beds : []
    for (const bed of beds) {
      const b = asRecord(bed)
      if (!b) continue
      const type = (asString(b.type) ?? '').toUpperCase()
      const qty = asNumber(b.quantity) ?? 0
      if (type.includes('KING')) kings += qty
      else if (type.includes('QUEEN')) queens += qty
      else if (type.includes('TWIN') || type.includes('SINGLE')) twins += qty
    }
  }
  return { kings, queens, twins }
}

// ─── projection: raw → curated photo set ─────────────────────────────────────

// A single photo in the Data Master curated set (stored on Listing.photos).
//  - kind 'guesty': `src` is the Guesty CDN URL (from the pulled snapshot)
//  - kind 'drive' : `src` is a Google Drive fileId (picked from the unit's folder)
export interface ListingPhoto {
  id: string
  kind: 'guesty' | 'drive'
  src: string
  order: number
}

/**
 * Seed the curated photo set from the Guesty snapshot — the photos currently
 * published in the listing, in their published order.
 */
export function projectListingPhotos(raw: RawListing): ListingPhoto[] {
  const pictures = Array.isArray(raw.pictures) ? raw.pictures : []
  const out: ListingPhoto[] = []
  pictures.forEach((p, i) => {
    const rec = asRecord(p)
    if (!rec) return
    const src = asString(rec.original) ?? asString(rec.thumbnail)
    if (!src) return
    out.push({ id: asString(rec._id) ?? `g${i}`, kind: 'guesty', src, order: i })
  })
  return out
}

export function projectListingToUnitBaseline(raw: RawListing): UnitBaselineFromGuesty {
  const { kings, queens, twins } = bedComposition(raw)
  return {
    bedrooms: asNumber(raw.bedrooms),
    bathrooms: asNumber(raw.bathrooms),
    capacity: asNumber(raw.accommodates),
    totalBeds: asNumber(raw.beds),
    sqft: asNumber(raw.areaSquareFeet),
    kings,
    queens,
    twins,
    propertyType: asString(raw.propertyType) ?? asString(raw.type),
  }
}

// ─── custom fields ───────────────────────────────────────────────────────────
// Guesty splits custom fields into account-level DEFINITIONS (the schema: which
// fields exist, their label/type) and per-listing VALUES. The values already
// arrive inside each listing's raw payload as `customFields[].{ _id, fieldId,
// value }` (fieldId is opaque). We pull the definitions once to resolve
// `fieldId → displayName/type`, then combine on push.

type RawCustomFieldDef = Record<string, unknown>

// The definitions endpoint may return a bare array or an envelope; tolerate both.
interface CustomFieldDefsEnvelope {
  results?: RawCustomFieldDef[]
  data?: RawCustomFieldDef[]
  customFields?: RawCustomFieldDef[]
  fields?: RawCustomFieldDef[]
}

/**
 * Fetch every account-level custom field definition.
 * GET /v1/accounts/{accountId}/custom-fields → definitions (listing + reservation).
 */
export async function fetchCustomFieldDefinitions(token: string, accountId: string): Promise<RawCustomFieldDef[]> {
  const body = await guestyGet<RawCustomFieldDef[] | CustomFieldDefsEnvelope>(
    token,
    `/v1/accounts/${accountId}/custom-fields`
  )
  if (Array.isArray(body)) return body
  return body.results ?? body.data ?? body.customFields ?? body.fields ?? []
}

export interface ProjectedCustomFieldDef {
  guestyId: string // the Guesty fieldId
  displayName: string
  key: string | null
  objectType: string // "listing" | "reservation"
  type: string
  options: string[]
  isPublic: boolean | null
}

/** Map a raw Guesty custom field definition to typed columns, or null if it has no id. */
export function projectCustomFieldDefinition(raw: RawCustomFieldDef): ProjectedCustomFieldDef | null {
  const guestyId = asString(raw.fieldId) ?? asString(raw._id)
  const displayName = asString(raw.displayName) ?? asString(raw.key)
  if (!guestyId || !displayName) return null
  const options = Array.isArray(raw.options)
    ? raw.options.filter((o): o is string => typeof o === 'string')
    : []
  return {
    guestyId,
    displayName,
    key: asString(raw.key),
    objectType: asString(raw.object) ?? 'listing',
    type: asString(raw.type) ?? 'text',
    options,
    isPublic: asBool(raw.isPublic),
  }
}

// A promoted custom field on a Data Master Listing (stored on Listing.customFields).
export interface ListingCustomField {
  fieldId: string
  name: string // resolved from the definition; falls back to the fieldId
  type: string | null
  value: string | number | boolean | null
}

/**
 * Combine a listing's raw `customFields[]` values with the account definitions
 * map to produce labeled, promotable custom fields for Data Master.
 */
export function projectListingCustomFields(
  raw: RawListing,
  defs: Map<string, { displayName: string; type: string }>
): ListingCustomField[] {
  const list = Array.isArray(raw.customFields) ? raw.customFields : []
  const out: ListingCustomField[] = []
  for (const item of list) {
    const rec = asRecord(item)
    if (!rec) continue
    const fieldId = asString(rec.fieldId)
    if (!fieldId) continue
    const def = defs.get(fieldId)
    const value = rec.value
    out.push({
      fieldId,
      name: def?.displayName ?? fieldId,
      type: def?.type ?? null,
      value:
        typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          ? value
          : value == null
            ? null
            : String(value),
    })
  }
  return out
}
