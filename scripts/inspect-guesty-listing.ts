// Phase 0 discovery for the Data Master → Listings module.
//
// Flattens every `GuestyListing.raw` payload already synced from Guesty and
// reports, for each JSON path: its observed type(s), how often it is present
// across listings, and a sample value. This tells us exactly which fields the
// base GET /v1/listings/{id} object gives us for THIS account — so we know what
// we already have vs. what genuinely requires the extra listing-ID endpoints
// (descriptions, photos, amenities, spaces, financials, ownerships, …).
//
// Read-only: it only SELECTs from the DB and writes Markdown to stdout.
//
// Run from project root with the cloud-sql-proxy running and .env.local loaded:
//   tsx --env-file=.env.local scripts/inspect-guesty-listing.ts > docs/guesty-listing-api-map.md
//
// Requires DATABASE_URL in env (.env.local).
import { db } from '@/lib/db'

// ─── flattening ────────────────────────────────────────────────────────────

type Json = unknown

interface PathStat {
  path: string
  types: Set<string>
  present: number // how many listings have a non-null value at this path
  arrayLens: number[] // observed array lengths (for array paths)
  sample: unknown // first non-null sample seen
}

/** Describe a JSON value's type for the report. */
function typeOf(v: Json): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (v instanceof Date) return 'date'
  return typeof v // string | number | boolean | object
}

/**
 * Walk a raw listing object and record every leaf + container path into `stats`.
 * Arrays are summarized as a single `[]` path (we recurse into element 0 only,
 * tagging the path with `[]` so we don't explode on per-index keys).
 */
function walk(value: Json, prefix: string, stats: Map<string, PathStat>, seenInThisListing: Set<string>): void {
  const t = typeOf(value)

  // Record the current path (skip the synthetic root '').
  if (prefix) {
    record(stats, prefix, t, value, seenInThisListing)
  }

  if (t === 'object') {
    const obj = value as Record<string, Json>
    for (const key of Object.keys(obj)) {
      const childPath = prefix ? `${prefix}.${key}` : key
      walk(obj[key], childPath, stats, seenInThisListing)
    }
  } else if (t === 'array') {
    const arr = value as Json[]
    const arrPath = `${prefix}[]`
    // Note the array length under the array's own path stat.
    const stat = stats.get(prefix)
    if (stat) stat.arrayLens.push(arr.length)
    // Recurse into the first element only to learn element shape.
    if (arr.length > 0) {
      walk(arr[0], arrPath, stats, seenInThisListing)
    }
  }
}

function record(
  stats: Map<string, PathStat>,
  path: string,
  type: string,
  value: Json,
  seenInThisListing: Set<string>,
): void {
  let stat = stats.get(path)
  if (!stat) {
    stat = { path, types: new Set(), present: 0, arrayLens: [], sample: undefined }
    stats.set(path, stat)
  }
  stat.types.add(type)
  // Count presence once per listing, and only for non-null/non-empty values.
  const isPresent = value !== null && value !== undefined && value !== ''
  if (isPresent && !seenInThisListing.has(path)) {
    stat.present += 1
    seenInThisListing.add(path)
  }
  if (stat.sample === undefined && isPresent && type !== 'object' && type !== 'array') {
    stat.sample = value
  }
}

// ─── reporting helpers ───────────────────────────────────────────────────────

function fence(s: unknown): string {
  return '`' + String(s) + '`'
}

/** Truncate + single-line a sample value so the report stays readable and PII-light. */
function fmtSample(v: unknown): string {
  if (v === undefined) return ''
  let s = typeof v === 'string' ? v : JSON.stringify(v)
  s = s.replace(/\s+/g, ' ').trim()
  if (s.length > 60) s = s.slice(0, 57) + '…'
  // Escape pipe so it doesn't break the Markdown table.
  return '`' + s.replace(/\|/g, '\\|') + '`'
}

function pct(n: number, total: number): string {
  if (total === 0) return '0%'
  return `${Math.round((n / total) * 100)}%`
}

async function main(): Promise<void> {
  const total = await db.guestyListing.count()

  console.log('# Guesty Listing — API Field & Endpoint Map')
  console.log('')
  console.log(`Generated:        ${new Date().toISOString()}`)
  console.log(`Listings in DB:   ${total}`)
  console.log('')

  if (total === 0) {
    console.log('> **No synced listings found.** Open `/integrations/guesty`, connect, and run a')
    console.log('> sync first, then re-run this script. (`GuestyListing` table is empty.)')
    await db.$disconnect()
    return
  }

  // Pull every raw payload. Listings are ~300 max — fine to load in one query.
  const rows = await db.guestyListing.findMany({ select: { raw: true } })

  const stats = new Map<string, PathStat>()
  for (const row of rows) {
    const seen = new Set<string>()
    walk(row.raw as Json, '', stats, seen)
  }

  const sorted = [...stats.values()].sort((a, b) => a.path.localeCompare(b.path))

  // ── Part A — base object field catalog (from real data) ───────────────────
  console.log('## Part A — Base `GET /v1/listings/{id}` object (from real synced data)')
  console.log('')
  console.log(`Flattened from ${total} listings stored in \`GuestyListing.raw\`. "Present" = % of`)
  console.log('listings with a non-empty value at that path. Array paths are marked `[]`.')
  console.log('')
  console.log('| # | path | type(s) | present | sample |')
  console.log('|---|---|---|---:|---|')
  sorted.forEach((s, i) => {
    const types = [...s.types].filter((t) => t !== 'null').join(', ') || 'null'
    const arrNote =
      s.arrayLens.length > 0
        ? ` (len ${Math.min(...s.arrayLens)}–${Math.max(...s.arrayLens)})`
        : ''
    console.log(
      `| ${i + 1} | ${fence(s.path)} | ${types}${arrNote} | ${pct(s.present, total)} | ${fmtSample(s.sample)} |`,
    )
  })
  console.log('')
  console.log(`Total distinct paths: ${sorted.length}`)
  console.log('')

  await db.$disconnect()
}

main().catch(async (e) => {
  console.error('Inspection failed:', e)
  await db.$disconnect()
  process.exit(1)
})
