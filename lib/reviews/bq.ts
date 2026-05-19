// Live read layer over `miami-vr-data.reva_reviews.reviews`.
// All four exports take the same ReviewFilters and translate them into the
// matching BigQuery WHERE clause via a single `buildWhere()` helper so the
// list, KPIs, monthly trend, and filter-options endpoints never drift apart.
import type { OtaSource } from '@prisma/client'
import { getBigQueryClient } from '@/lib/integrations/bigquery'
import type {
  ReviewFilters,
  ReviewRow,
  ReviewsSummary,
  ReviewsMonthlyPoint,
  ReviewsFilterOptions,
  HeatmapRow,
  HeatmapRowDim,
  HeatmapColDim,
  DailyVolumePoint,
  TagDistRow,
  UnitSummary,
} from './types'

const TABLE = '`miami-vr-data.reva_reviews.reviews`'

// ── OTA mapping (kept local — mapOta in lib/integrations/bigquery.ts is private).
const OTA_PATTERNS: Array<[string, OtaSource]> = [
  ['airbnb',   'airbnb'],
  ['booking',  'booking'],
  ['bkns',     'booking'],
  ['homeaway', 'vrbo'],
  ['vrbo',     'vrbo'],
  ['expedia',  'expedia'],
  ['vacasa',   'vacasa'],
]
function mapOta(raw: string | null | undefined): OtaSource {
  if (!raw) return 'other'
  const lower = raw.toLowerCase()
  for (const [pattern, value] of OTA_PATTERNS) {
    if (lower.includes(pattern)) return value
  }
  return 'other'
}

// Reverse mapping: which channel_name substrings count as a given OtaSource.
// Used to translate the UI filter (which speaks the enum) back into BQ
// substring matching on `channel_name`.
const OTA_TO_PATTERNS: Record<OtaSource, string[]> = {
  airbnb:  ['airbnb'],
  booking: ['booking', 'bkns'],
  vrbo:    ['vrbo', 'homeaway'],
  expedia: ['expedia'],
  vacasa:  ['vacasa'],
  other:   [], // handled separately — see buildWhere()
}

// BQ returns DATE/TIMESTAMP columns as `{ value: '…' }` envelopes.
function unwrapBq(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const inner = (v as { value: unknown }).value
    return typeof inner === 'string' ? inner : null
  }
  return null
}

interface BqWhere {
  sql:    string
  params: Record<string, unknown>
}

function buildWhere(filters: ReviewFilters): BqWhere {
  const clauses: string[] = ["review_of = 'Unit'"]
  const params: Record<string, unknown> = {}

  // Stars — discrete multi-select 1..5.
  if (filters.stars.length > 0) {
    params.stars = filters.stars
    clauses.push('rating IN UNNEST(@stars)')
  }

  // OTAs — the UI sends enum values; expand to channel_name substring matches.
  if (filters.otas.length > 0) {
    const otaTokens: string[] = []
    let hasOther = false
    for (const o of filters.otas as OtaSource[]) {
      if (o === 'other') { hasOther = true; continue }
      for (const pat of OTA_TO_PATTERNS[o] ?? []) otaTokens.push(pat)
    }
    const sub: string[] = []
    if (otaTokens.length > 0) {
      params.otaTokens = otaTokens
      sub.push('EXISTS (SELECT 1 FROM UNNEST(@otaTokens) tok WHERE LOWER(IFNULL(channel_name, "")) LIKE CONCAT("%", tok, "%"))')
    }
    if (hasOther) {
      const knownTokens = Object.values(OTA_TO_PATTERNS).flat()
      params.knownOtaTokens = knownTokens
      sub.push('NOT EXISTS (SELECT 1 FROM UNNEST(@knownOtaTokens) tok WHERE LOWER(IFNULL(channel_name, "")) LIKE CONCAT("%", tok, "%"))')
    }
    if (sub.length > 0) clauses.push(`(${sub.join(' OR ')})`)
  }

  // Buildings — soft join by unit_name prefix (e.g. "Icon %").
  if (filters.buildings.length > 0) {
    params.buildings = filters.buildings
    clauses.push('EXISTS (SELECT 1 FROM UNNEST(@buildings) b WHERE STARTS_WITH(IFNULL(unit_name, ""), CONCAT(b, " ")) OR IFNULL(unit_name, "") = b)')
  }

  // Units — exact `unit_name` match. Narrower than buildings; when both are
  // selected they AND together (building prefix AND unit in list).
  if (filters.units.length > 0) {
    params.units = filters.units
    clauses.push('unit_name IN UNNEST(@units)')
  }

  // Year multi-select — translated to EXTRACT(YEAR FROM date) IN (…).
  if (filters.years.length > 0) {
    params.years = filters.years
    clauses.push('EXTRACT(YEAR FROM date) IN UNNEST(@years)')
  }

  // Date range — inclusive (kept for API back-compat; UI no longer surfaces it).
  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom
    clauses.push('date >= DATE(@dateFrom)')
  }
  if (filters.dateTo) {
    params.dateTo = filters.dateTo
    clauses.push('date <= DATE(@dateTo)')
  }

  // Unit search — case-insensitive substring on unit_name. Drives the
  // "search by unit" input in the Performance filter bar.
  if (filters.unitSearch) {
    params.unitSearch = filters.unitSearch.toLowerCase()
    clauses.push('LOWER(IFNULL(unit_name, "")) LIKE CONCAT("%", @unitSearch, "%")')
  }

  return { sql: clauses.join(' AND '), params }
}

// Convert a BQ row (raw shape) to the API/client ReviewRow shape.
function toReviewRow(r: Record<string, unknown>): ReviewRow {
  const unitName = (r.unit_name as string | null | undefined) ?? null
  const prefix   = unitName ? (unitName.split(' ')[0] ?? null) : null
  const channel  = (r.channel_name as string | null | undefined) ?? ''
  return {
    id:               String(r.id ?? ''),
    otaSource:        mapOta(channel),
    channelName:      channel,
    rating:           typeof r.rating === 'number' ? r.rating : (r.rating == null ? null : Number(r.rating)),
    date:             unwrapBq(r.date) ?? '',
    updatedAt:        unwrapBq(r.updated_at) ?? '',
    title:            (r.title as string | null | undefined) ?? null,
    description:      (r.description as string | null | undefined) ?? null,
    guestName:        (r.guest_name as string | null | undefined) ?? null,
    hostResponded:    Boolean(r.host_response),
    hostResponseText: (r.host_response_text as string | null | undefined) ?? null,
    positiveTags:     Array.isArray(r.positive_tags) ? (r.positive_tags as string[]) : [],
    negativeTags:     Array.isArray(r.negative_tags) ? (r.negative_tags as string[]) : [],
    unitName,
    buildingPrefix:   prefix,
    unitProviderId:   (r.unit_provider_id as string | null | undefined) ?? null,
    reviewOf:         (r.review_of as string | null | undefined) ?? null,
    displayOnWebsite: Boolean(r.display_on_website),
    reservationId:    (r.reservation_id as string | null | undefined) ?? null,
  }
}

const SELECT_COLS = `
  id, channel_name, rating, date, updated_at, title, description, guest_name,
  host_response, host_response_text, positive_tags, negative_tags,
  unit_name, unit_provider_id, review_of, timing, display_on_website,
  etl_loaded_at, reservation_id
`.trim()

// ──────────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────────

export async function fetchReviewsList(
  filters: ReviewFilters
): Promise<{ rows: ReviewRow[]; totalCount: number }> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  const offset = filters.page * filters.pageSize
  const listSql = `
    SELECT ${SELECT_COLS}
    FROM ${TABLE}
    WHERE ${sql}
    ORDER BY date DESC, updated_at DESC
    LIMIT @limit OFFSET @offset
  `
  const countSql = `SELECT COUNT(*) AS n FROM ${TABLE} WHERE ${sql}`

  const [[rows], [countRows]] = await Promise.all([
    bq.query({
      query:  listSql,
      params: { ...params, limit: filters.pageSize, offset },
      useLegacySql: false,
    }),
    bq.query({ query: countSql, params, useLegacySql: false }),
  ])

  const totalCount = Number((countRows[0] as { n: number | string }).n ?? 0)
  return {
    rows: (rows as Array<Record<string, unknown>>).map(toReviewRow),
    totalCount,
  }
}

export async function fetchReviewsKPIs(filters: ReviewFilters): Promise<ReviewsSummary> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  const summarySql = `
    SELECT
      COUNT(*)                                                AS total,
      AVG(rating)                                             AS avg_rating,
      COUNTIF(rating = 1)                                     AS r1,
      COUNTIF(rating = 2)                                     AS r2,
      COUNTIF(rating = 3)                                     AS r3,
      COUNTIF(rating = 4)                                     AS r4,
      COUNTIF(rating = 5)                                     AS r5,
      COUNTIF(rating IS NOT NULL AND rating < 3)              AS low_n,
      COUNTIF(rating IS NOT NULL AND rating >= 3 AND rating < 4) AS mid_n,
      COUNTIF(host_response IS TRUE)                          AS responded_n,
      MAX(etl_loaded_at)                                      AS etl_max
    FROM ${TABLE}
    WHERE ${sql}
  `

  const otaSql = `
    SELECT channel_name, COUNT(*) AS n, AVG(rating) AS avg_rating
    FROM ${TABLE}
    WHERE ${sql}
    GROUP BY channel_name
    ORDER BY n DESC
  `

  const buildingSql = `
    SELECT
      SPLIT(unit_name, ' ')[OFFSET(0)] AS building_prefix,
      COUNT(*)                         AS n,
      AVG(rating)                      AS avg_rating
    FROM ${TABLE}
    WHERE ${sql} AND unit_name IS NOT NULL
    GROUP BY building_prefix
    ORDER BY n DESC
    LIMIT 50
  `

  const [[summaryRows], [otaRows], [buildingRows]] = await Promise.all([
    bq.query({ query: summarySql, params, useLegacySql: false }),
    bq.query({ query: otaSql, params, useLegacySql: false }),
    bq.query({ query: buildingSql, params, useLegacySql: false }),
  ])

  const s = (summaryRows[0] ?? {}) as Record<string, unknown>
  const totalReviews = Number(s.total ?? 0)
  const avgRating    = s.avg_rating == null ? null : Number(s.avg_rating)

  // Aggregate channel_name → OtaSource (e.g. multiple Booking variants collapse).
  const byOtaMap = new Map<OtaSource, { count: number; ratingSum: number; ratingN: number }>()
  for (const r of otaRows as Array<{ channel_name?: string; n?: number | string; avg_rating?: number | string | null }>) {
    const ota   = mapOta(r.channel_name)
    const count = Number(r.n ?? 0)
    const avg   = r.avg_rating == null ? null : Number(r.avg_rating)
    const slot  = byOtaMap.get(ota) ?? { count: 0, ratingSum: 0, ratingN: 0 }
    slot.count += count
    if (avg != null) { slot.ratingSum += avg * count; slot.ratingN += count }
    byOtaMap.set(ota, slot)
  }
  const byOta = Array.from(byOtaMap.entries()).map(([otaSource, v]) => ({
    otaSource,
    count: v.count,
    avgRating: v.ratingN > 0 ? v.ratingSum / v.ratingN : null,
  }))

  const byBuilding = (buildingRows as Array<{ building_prefix?: string; n?: number | string; avg_rating?: number | string | null }>)
    .filter((r) => Boolean(r.building_prefix))
    .map((r) => ({
      buildingPrefix: String(r.building_prefix),
      count:          Number(r.n ?? 0),
      avgRating:      r.avg_rating == null ? null : Number(r.avg_rating),
    }))

  const r5Count   = Number(s.r5 ?? 0)
  const responded = Number(s.responded_n ?? 0)

  return {
    totalReviews,
    avgRating,
    ratingBuckets: {
      '1': Number(s.r1 ?? 0),
      '2': Number(s.r2 ?? 0),
      '3': Number(s.r3 ?? 0),
      '4': Number(s.r4 ?? 0),
      '5': r5Count,
    },
    byOta,
    byBuilding,
    lowRatingCount: Number(s.low_n ?? 0),
    midRatingCount: Number(s.mid_n ?? 0),
    fiveStarRate:   totalReviews > 0 ? r5Count / totalReviews   : null,
    responseRate:   totalReviews > 0 ? responded / totalReviews : null,
    etlLoadedAt:    unwrapBq(s.etl_max),
  }
}

export async function fetchReviewsMonthlyTrend(
  filters: ReviewFilters
): Promise<ReviewsMonthlyPoint[]> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  const monthlySql = `
    SELECT
      FORMAT_DATE('%Y-%m', date) AS month,
      COUNT(*)                   AS n,
      AVG(rating)                AS avg_rating
    FROM ${TABLE}
    WHERE ${sql} AND date IS NOT NULL
    GROUP BY month
    ORDER BY month ASC
  `

  const [rows] = await bq.query({ query: monthlySql, params, useLegacySql: false })

  return (rows as Array<{ month?: string; n?: number | string; avg_rating?: number | string | null }>)
    .filter((r) => Boolean(r.month))
    .map((r) => ({
      month:     String(r.month),
      count:     Number(r.n ?? 0),
      avgRating: r.avg_rating == null ? null : Number(r.avg_rating),
    }))
}

// ── Phase 2 aggregates ────────────────────────────────────────────────────

// Map UI row-dim to the SQL expression used in SELECT + GROUP BY.
function rowDimSql(dim: HeatmapRowDim): { expr: string; extraWhere: string } {
  switch (dim) {
    case 'building':
      return {
        expr:       "SPLIT(unit_name, ' ')[OFFSET(0)]",
        extraWhere: 'unit_name IS NOT NULL',
      }
    case 'channel':
      return {
        expr:       'IFNULL(channel_name, "Other")',
        extraWhere: '1=1',
      }
    case 'rating':
      return {
        expr:       'IFNULL(CAST(rating AS STRING), "—")',
        extraWhere: '1=1',
      }
  }
}

// Map UI col-dim to the SQL expression. Week is ISO week (Monday-anchored).
function colDimSql(dim: HeatmapColDim): string {
  switch (dim) {
    case 'day':   return "FORMAT_DATE('%Y-%m-%d', date)"
    case 'week':  return "FORMAT_DATE('%G-W%V', date)"  // ISO year + ISO week
    case 'month': return "FORMAT_DATE('%Y-%m', date)"
  }
}

export async function fetchHeatmap(
  filters: ReviewFilters,
  rowDim:  HeatmapRowDim = 'building',
  colDim:  HeatmapColDim = 'month'
): Promise<HeatmapRow[]> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)
  const r = rowDimSql(rowDim)
  const c = colDimSql(colDim)

  const heatmapSql = `
    SELECT
      ${r.expr}        AS row_label,
      ${c}             AS col_label,
      AVG(rating)      AS avg_rating,
      COUNT(*)         AS n
    FROM ${TABLE}
    WHERE ${sql} AND date IS NOT NULL AND ${r.extraWhere}
    GROUP BY row_label, col_label
    ORDER BY row_label, col_label
  `

  const [rows] = await bq.query({ query: heatmapSql, params, useLegacySql: false })

  return (rows as Array<{ row_label?: string; col_label?: string; avg_rating?: number | string | null; n?: number | string }>)
    .filter((x) => Boolean(x.row_label) && Boolean(x.col_label))
    .map((x) => ({
      row:       String(x.row_label),
      col:       String(x.col_label),
      avgRating: x.avg_rating == null ? null : Number(x.avg_rating),
      count:     Number(x.n ?? 0),
    }))
}

export async function fetchDailyVolume(filters: ReviewFilters): Promise<DailyVolumePoint[]> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  // Grouped by (day, channel) so the chart can render both an Overall trend
  // and a per-channel breakdown without a separate query. Multiple BQ rows
  // can collapse to the same OtaSource (e.g. "Booking" + "Booking.com") —
  // the JS post-process folds them into one bucket per (day, OtaSource).
  const dailySql = `
    SELECT
      FORMAT_DATE('%Y-%m-%d', date) AS day,
      channel_name                  AS channel_name,
      COUNT(*)                      AS n,
      AVG(rating)                   AS avg_rating
    FROM ${TABLE}
    WHERE ${sql} AND date IS NOT NULL
    GROUP BY day, channel_name
    ORDER BY day ASC
  `

  const [rows] = await bq.query({ query: dailySql, params, useLegacySql: false })

  // Merge BQ rows that share the same (day, mapped-OtaSource) — keeps the
  // chart's weighted-avg math correct when two channel_name variants map to
  // the same enum value.
  const merged = new Map<string, { date: string; channel: OtaSource; count: number; ratingSum: number; ratingDenom: number }>()
  for (const r of rows as Array<{ day?: string; channel_name?: string; n?: number | string; avg_rating?: number | string | null }>) {
    if (!r.day) continue
    const date    = String(r.day)
    const channel = mapOta(r.channel_name ?? null)
    const count   = Number(r.n ?? 0)
    const avg     = r.avg_rating == null ? null : Number(r.avg_rating)
    const key     = `${date}::${channel}`
    const slot    = merged.get(key) ?? { date, channel, count: 0, ratingSum: 0, ratingDenom: 0 }
    slot.count += count
    if (avg != null) {
      slot.ratingSum   += avg * count
      slot.ratingDenom += count
    }
    merged.set(key, slot)
  }

  return Array.from(merged.values()).map((s) => ({
    date:      s.date,
    channel:   s.channel,
    count:     s.count,
    avgRating: s.ratingDenom > 0 ? s.ratingSum / s.ratingDenom : null,
  }))
}

export async function fetchTagDistribution(filters: ReviewFilters): Promise<TagDistRow[]> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  // UNION the two tag arrays — single round trip, single set of named params.
  const tagSql = `
    SELECT 'positive' AS kind, tag, COUNT(*) AS n
    FROM ${TABLE}, UNNEST(positive_tags) AS tag
    WHERE ${sql}
    GROUP BY tag
    UNION ALL
    SELECT 'negative' AS kind, tag, COUNT(*) AS n
    FROM ${TABLE}, UNNEST(negative_tags) AS tag
    WHERE ${sql}
    GROUP BY tag
    ORDER BY kind, n DESC
  `

  const [rows] = await bq.query({ query: tagSql, params, useLegacySql: false })

  return (rows as Array<{ kind?: string; tag?: string; n?: number | string }>)
    .filter((r) => Boolean(r.tag) && (r.kind === 'positive' || r.kind === 'negative'))
    .map((r) => ({
      kind:  r.kind as 'positive' | 'negative',
      tag:   String(r.tag),
      count: Number(r.n ?? 0),
    }))
}

export interface LatestBucketOpts {
  /** Inclusive rating floor for the bucket — e.g. 4 for "good", omit if `ratingLte` covers it. */
  ratingGte?:   number
  /** Inclusive rating ceiling — e.g. 3 for "bad". */
  ratingLte?:   number
  /** When set, require this string to be present in `positive_tags`. */
  positiveTag?: string | null
  /** When set, require this string to be present in `negative_tags`. */
  negativeTag?: string | null
  /** Default 5. Hard cap 50 to keep the panel snappy. */
  limit?:       number
}

// Fetches the latest reviews matching a rating bucket and optional tag — used
// by the Overview's Latest Good / Latest Bad panels. Goes directly to BQ each
// call so the result reflects the full universe (not just the current page).
export async function fetchLatestForBucket(
  filters: ReviewFilters,
  opts:    LatestBucketOpts
): Promise<ReviewRow[]> {
  const bq = getBigQueryClient()
  const { sql, params } = buildWhere(filters)

  const extra: string[] = []
  const xparams: Record<string, unknown> = { ...params }

  if (typeof opts.ratingGte === 'number') {
    xparams.ratingGte = opts.ratingGte
    extra.push('rating >= @ratingGte')
  }
  if (typeof opts.ratingLte === 'number') {
    xparams.ratingLte = opts.ratingLte
    extra.push('rating <= @ratingLte')
  }
  if (opts.positiveTag) {
    xparams.positiveTag = opts.positiveTag
    extra.push('@positiveTag IN UNNEST(positive_tags)')
  }
  if (opts.negativeTag) {
    xparams.negativeTag = opts.negativeTag
    extra.push('@negativeTag IN UNNEST(negative_tags)')
  }

  const limit = Math.min(50, Math.max(1, opts.limit ?? 5))
  xparams.latestLimit = limit

  const fullWhere = extra.length === 0 ? sql : `${sql} AND ${extra.join(' AND ')}`

  const latestSql = `
    SELECT ${SELECT_COLS}
    FROM ${TABLE}
    WHERE ${fullWhere}
    ORDER BY date DESC, updated_at DESC
    LIMIT @latestLimit
  `

  const [rows] = await bq.query({ query: latestSql, params: xparams, useLegacySql: false })
  return (rows as Array<Record<string, unknown>>).map(toReviewRow)
}

// Per-unit summary used by the review detail modal. Reads the full review
// history of a single unit (ignores the page-level scope) so the modal
// always provides unit-wide context regardless of which year/building/etc.
// the user has filtered by.
export async function fetchUnitSummary(unitName: string): Promise<UnitSummary> {
  const bq = getBigQueryClient()

  const summarySql = `
    SELECT
      COUNT(*)              AS total,
      AVG(rating)           AS avg_rating,
      COUNTIF(rating = 1)   AS r1,
      COUNTIF(rating = 2)   AS r2,
      COUNTIF(rating = 3)   AS r3,
      COUNTIF(rating = 4)   AS r4,
      COUNTIF(rating = 5)   AS r5
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND unit_name = @unitName
  `

  const otaSql = `
    SELECT channel_name, COUNT(*) AS n, AVG(rating) AS avg_rating
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND unit_name = @unitName
    GROUP BY channel_name
    ORDER BY n DESC
  `

  const [[summaryRows], [otaRows]] = await Promise.all([
    bq.query({ query: summarySql, params: { unitName }, useLegacySql: false }),
    bq.query({ query: otaSql,     params: { unitName }, useLegacySql: false }),
  ])

  const s = (summaryRows[0] ?? {}) as Record<string, unknown>
  const totalReviews = Number(s.total ?? 0)
  const avgRating    = s.avg_rating == null ? null : Number(s.avg_rating)

  // Fold raw channel_name variants into the OtaSource enum, same approach as
  // fetchReviewsKPIs so "Booking" + "Booking.com" collapse to one bucket.
  const byOtaMap = new Map<OtaSource, { count: number; ratingSum: number; ratingN: number }>()
  for (const r of otaRows as Array<{ channel_name?: string; n?: number | string; avg_rating?: number | string | null }>) {
    const ota   = mapOta(r.channel_name)
    const count = Number(r.n ?? 0)
    const avg   = r.avg_rating == null ? null : Number(r.avg_rating)
    const slot  = byOtaMap.get(ota) ?? { count: 0, ratingSum: 0, ratingN: 0 }
    slot.count += count
    if (avg != null) { slot.ratingSum += avg * count; slot.ratingN += count }
    byOtaMap.set(ota, slot)
  }
  const byOta = Array.from(byOtaMap.entries())
    .map(([otaSource, v]) => ({
      otaSource,
      count: v.count,
      avgRating: v.ratingN > 0 ? v.ratingSum / v.ratingN : null,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    unitName,
    totalReviews,
    avgRating,
    byOta,
    ratingBuckets: {
      '1': Number(s.r1 ?? 0),
      '2': Number(s.r2 ?? 0),
      '3': Number(s.r3 ?? 0),
      '4': Number(s.r4 ?? 0),
      '5': Number(s.r5 ?? 0),
    },
  }
}

export async function fetchFilterOptions(): Promise<ReviewsFilterOptions> {
  const bq = getBigQueryClient()

  // Always reads the full unfiltered universe so the dropdown shows everything
  // the user could pick — not just what their current filters already match.
  const buildingsSql = `
    SELECT DISTINCT SPLIT(unit_name, ' ')[OFFSET(0)] AS building_prefix
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND unit_name IS NOT NULL
    ORDER BY building_prefix
  `
  const unitsSql = `
    SELECT DISTINCT unit_name
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND unit_name IS NOT NULL
    ORDER BY unit_name
  `
  const channelsSql = `
    SELECT DISTINCT channel_name
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND channel_name IS NOT NULL
  `
  const yearsSql = `
    SELECT DISTINCT EXTRACT(YEAR FROM date) AS y
    FROM ${TABLE}
    WHERE review_of = 'Unit' AND date IS NOT NULL
    ORDER BY y DESC
  `

  const [[buildingRows], [unitRows], [channelRows], [yearRows]] = await Promise.all([
    bq.query({ query: buildingsSql, useLegacySql: false }),
    bq.query({ query: unitsSql,     useLegacySql: false }),
    bq.query({ query: channelsSql,  useLegacySql: false }),
    bq.query({ query: yearsSql,     useLegacySql: false }),
  ])

  const buildings = (buildingRows as Array<{ building_prefix?: string }>)
    .map((r) => r.building_prefix)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const units = (unitRows as Array<{ unit_name?: string }>)
    .map((r) => r.unit_name)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const otaSet = new Set<OtaSource>()
  for (const r of channelRows as Array<{ channel_name?: string }>) {
    otaSet.add(mapOta(r.channel_name))
  }
  const otas = Array.from(otaSet).sort()

  const years = (yearRows as Array<{ y?: number | string }>)
    .map((r) => Number(r.y))
    .filter((n) => Number.isInteger(n) && n >= 2000 && n <= 2100)

  return { buildings, units, otas, years }
}
