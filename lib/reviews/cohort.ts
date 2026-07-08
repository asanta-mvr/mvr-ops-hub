// Checkout-cohort analytics for the Reviews → Performance tab.
//
// Volume, review rate, and quality are computed on the **checkout cohort**:
// confirmed guest reservations (`ops.ops_reservations`) LEFT JOINed to their
// review (`ops.ops_reviews_processed`) on `reservation_id`, both anchored on
// `check_out_date_localized`. This answers the COO's "review rate" question
// directly — numerator (reviewed stays) and denominator (all stays) are the
// same guests — and is the definition validated in scripts/spike-review-rate.ts.
//
// Tags + response rate are NOT here: they live only in `reva_reviews` (no
// host_response/tags in the processed table; the processed→reva_reviews join
// is empty). See lib/reviews/bq.ts for those publish-date metrics.
import type { OtaSource } from '@prisma/client'
import { getBigQueryClient } from '@/lib/integrations/bigquery'
import type {
  CohortSegmentDim,
  CohortSegmentRow,
  CohortWeekPoint,
  ReviewFilters,
} from './types'

const RESERVATIONS = '`miami-vr-data.ops.ops_reservations`'
const PROCESSED    = '`miami-vr-data.ops.ops_reviews_processed`'

// Outlier = avg rating this far below portfolio avg, with at least this many
// reviews (so a single 1★ in a tiny channel doesn't dominate the headline).
const OUTLIER_RATING_GAP = 0.5
const OUTLIER_MIN_REVIEWS = 5

// Reviews keep arriving for ~3–4 weeks after checkout, so recent weeks
// under-count. MATURITY_DAYS flags a week as "still maturing" in the trend;
// MATURITY_WEEKS is how many trailing ISO weeks the segment windows skip so
// "last 4 weeks by channel/building" reflects *complete* weeks, not a cliff.
const MATURITY_DAYS = 28
const MATURITY_WEEKS = 4

// ── source → OtaSource (same substring patterns as lib/integrations/bigquery.ts;
//    ops_reservations.source values: airbnb2, VRBO, Expedia, Booking.com,
//    HomeAway*, vacasa, plus manual/website/owner = direct → 'other').
const OTA_PATTERNS: Array<[string, OtaSource]> = [
  ['airbnb',   'airbnb'],
  ['booking',  'booking'],
  ['bkns',     'booking'],
  ['homeaway', 'vrbo'],
  ['vrbo',     'vrbo'],
  ['expedia',  'expedia'],
  ['vacasa',   'vacasa'],
]
function mapSource(raw: string | null | undefined): OtaSource {
  if (!raw) return 'other'
  const lower = raw.toLowerCase()
  for (const [pattern, value] of OTA_PATTERNS) {
    if (lower.includes(pattern)) return value
  }
  return 'other'
}
const OTA_TO_PATTERNS: Record<OtaSource, string[]> = {
  airbnb:  ['airbnb'],
  booking: ['booking', 'bkns'],
  vrbo:    ['vrbo', 'homeaway'],
  expedia: ['expedia'],
  vacasa:  ['vacasa'],
  other:   [],
}
export const OTA_LABEL: Record<OtaSource, string> = {
  airbnb:  'Airbnb',
  booking: 'Booking.com',
  vrbo:    'Vrbo',
  expedia: 'Expedia',
  vacasa:  'Vacasa',
  other:   'Direct / Other',
}

// Normalized 1–5 rating, coalesced across channels. Booking's `_fixed` variant
// is already 1–5 (raw bdc_review_rating is 1–10 — don't use it). Vrbo carries
// stray >5 values in the source data, so clamp to 5.
const RATING_EXPR =
  'COALESCE(airbnb_overall_rating, LEAST(vrbo_overall_rating, 5), bdc_review_rating_fixed)'

// One review row per reservation (a stay could in theory carry rows for >1
// channel; MAX collapses to a single normalized rating so the LEFT JOIN below
// can't inflate the reservation count).
const REV_CTE = `
  rev AS (
    SELECT reservation_id, MAX(${RATING_EXPR}) AS rating
    FROM ${PROCESSED}
    WHERE reservation_id IS NOT NULL
    GROUP BY reservation_id
  )
`

interface CohortScope {
  sql:    string
  params: Record<string, unknown>
}

// WHERE clauses on the reservation alias `r`. Always restricts to confirmed
// guest stays (excludes inquiry/canceled/expired/declined + owner blocks — none
// of which can produce a guest review). Honors the OTA and building filters;
// the Performance filter bar's `units`/`stars` don't map to reservations and
// are intentionally ignored (the cohort is reservation-shaped, not review-shaped).
function buildCohortScope(filters: ReviewFilters): CohortScope {
  const clauses: string[] = [
    "LOWER(IFNULL(r.status, '')) = 'confirmed'",
    "LOWER(IFNULL(r.source, '')) NOT IN ('owner', 'owner-guest')",
  ]
  const params: Record<string, unknown> = {}

  if (filters.otas.length > 0) {
    const tokens: string[] = []
    let hasOther = false
    for (const o of filters.otas as OtaSource[]) {
      if (o === 'other') { hasOther = true; continue }
      for (const pat of OTA_TO_PATTERNS[o] ?? []) tokens.push(pat)
    }
    const sub: string[] = []
    if (tokens.length > 0) {
      params.otaTokens = tokens
      sub.push('EXISTS (SELECT 1 FROM UNNEST(@otaTokens) t WHERE LOWER(IFNULL(r.source, "")) LIKE CONCAT("%", t, "%"))')
    }
    if (hasOther) {
      params.knownTokens = Object.values(OTA_TO_PATTERNS).flat()
      sub.push('NOT EXISTS (SELECT 1 FROM UNNEST(@knownTokens) t WHERE LOWER(IFNULL(r.source, "")) LIKE CONCAT("%", t, "%"))')
    }
    if (sub.length > 0) clauses.push(`(${sub.join(' OR ')})`)
  }

  if (filters.buildings.length > 0) {
    params.buildings = filters.buildings
    clauses.push('r.building_name IN UNNEST(@buildings)')
  }

  return { sql: clauses.join(' AND '), params }
}

function num(v: unknown): number {
  return v == null ? 0 : Number(v)
}
function numOrNull(v: unknown): number | null {
  return v == null ? null : Number(v)
}
function unwrapDate(v: unknown): string {
  if (typeof v === 'string') return v
  if (v && typeof v === 'object' && 'value' in v) return String((v as { value: unknown }).value)
  return ''
}

/**
 * Weekly Pulse (PDF page 2) — the trailing `weeks` ISO weeks of the checkout
 * cohort. Rolling window ending at the current ISO week; honors the OTA and
 * building scope but NOT year/month (it's a recency view). Per week: confirmed
 * checkouts, reviewed stays, review rate, avg rating, 5★ rate, maturity flag.
 */
export async function fetchCohortWeeklyTrend(
  filters: ReviewFilters,
  weeks = 8
): Promise<CohortWeekPoint[]> {
  const bq = getBigQueryClient()
  const scope = buildCohortScope(filters)
  const weeksBack = Math.max(0, Math.trunc(weeks - 1))

  const query = `
    WITH ${REV_CTE},
    base AS (
      SELECT
        DATE_TRUNC(r.check_out_date_localized, ISOWEEK) AS week_start,
        rev.reservation_id IS NOT NULL                  AS has_review,
        rev.rating                                      AS rating
      FROM ${RESERVATIONS} r
      LEFT JOIN rev ON rev.reservation_id = r.reservation_id
      WHERE r.check_out_date_localized >= DATE_SUB(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL ${weeksBack} WEEK)
        AND r.check_out_date_localized <  DATE_ADD(DATE_TRUNC(CURRENT_DATE(), ISOWEEK), INTERVAL 1 WEEK)
        AND ${scope.sql}
    )
    SELECT
      week_start,
      FORMAT_DATE('%G-W%V', week_start)                                       AS iso_week,
      COUNT(*)                                                                AS reservations,
      COUNTIF(has_review)                                                     AS reviews,
      ROUND(AVG(IF(has_review, rating, NULL)), 3)                             AS avg_rating,
      SAFE_DIVIDE(COUNTIF(has_review AND rating >= 5), NULLIF(COUNTIF(has_review), 0)) AS five_star_rate
    FROM base
    GROUP BY week_start
    ORDER BY week_start
  `

  const [rows] = await bq.query({ query, params: scope.params, useLegacySql: false })

  const maturityCutoff = Date.now() - MATURITY_DAYS * 24 * 60 * 60 * 1000
  return (rows as Array<Record<string, unknown>>).map((r) => {
    const reservations = num(r.reservations)
    const reviews      = num(r.reviews)
    const weekStart    = unwrapDate(r.week_start)
    return {
      isoWeek:      String(r.iso_week ?? ''),
      weekStart,
      reservations,
      reviews,
      reviewRate:   reservations > 0 ? reviews / reservations : null,
      avgRating:    numOrNull(r.avg_rating),
      fiveStarRate: numOrNull(r.five_star_rate),
      maturing:     weekStart ? new Date(weekStart).getTime() > maturityCutoff : false,
    }
  })
}

/**
 * Segment Performance (PDF page 3) — per channel or building, the current
 * `windowWeeks`-week window with a trend delta vs the prior equal window, plus
 * an outlier flag + deterministic assessment for segments dragging the average.
 */
export async function fetchCohortSegments(
  filters: ReviewFilters,
  dim: CohortSegmentDim,
  windowWeeks = 4,
  offsetWeeks = MATURITY_WEEKS
): Promise<CohortSegmentRow[]> {
  const bq = getBigQueryClient()
  const scope = buildCohortScope(filters)
  const segExpr = dim === 'channel' ? "IFNULL(r.source, '(none)')" : "IFNULL(r.building_name, '(none)')"

  // Weeks-back from the current ISO week start (M0). The current window skips
  // the immature tail: current = [M0 − (offset+W) … M0 − offset); prior is the
  // equal window before it. With offset=4, W=4 → current = last 4 complete weeks.
  const w  = Math.max(1, Math.trunc(windowWeeks))
  const o  = Math.max(0, Math.trunc(offsetWeeks))
  const curUpperBack  = o          // exclusive upper bound of current window
  const curLowerBack  = o + w      // current window start
  const prevLowerBack = o + 2 * w  // prior window start
  const M0 = 'DATE_TRUNC(CURRENT_DATE(), ISOWEEK)'

  const query = `
    WITH ${REV_CTE},
    base AS (
      SELECT
        ${segExpr} AS seg,
        IF(r.check_out_date_localized >= DATE_SUB(${M0}, INTERVAL ${curLowerBack} WEEK), 'cur', 'prev') AS win,
        rev.reservation_id IS NOT NULL AS has_review,
        rev.rating                     AS rating
      FROM ${RESERVATIONS} r
      LEFT JOIN rev ON rev.reservation_id = r.reservation_id
      WHERE r.check_out_date_localized >= DATE_SUB(${M0}, INTERVAL ${prevLowerBack} WEEK)
        AND r.check_out_date_localized <  DATE_SUB(${M0}, INTERVAL ${curUpperBack} WEEK)
        AND ${scope.sql}
    )
    SELECT
      seg, win,
      COUNT(*)            AS reservations,
      COUNTIF(has_review) AS reviews,
      ROUND(AVG(IF(has_review, rating, NULL)), 3) AS avg_rating,
      SAFE_DIVIDE(COUNTIF(has_review AND rating >= 5), NULLIF(COUNTIF(has_review), 0)) AS five_star_rate
    FROM base
    GROUP BY seg, win
  `

  const [rows] = await bq.query({ query, params: scope.params, useLegacySql: false })

  // Fold raw rows into per-segment cur/prev slots. For the channel dim, many
  // raw source strings collapse to one OtaSource (airbnb2/uploaded_Airbnb → Airbnb).
  interface Slot { reservations: number; reviews: number; ratingSum: number; ratingN: number; fiveN: number }
  const empty = (): Slot => ({ reservations: 0, reviews: 0, ratingSum: 0, ratingN: 0, fiveN: 0 })
  const segs = new Map<string, { cur: Slot; prev: Slot }>()

  for (const r of rows as Array<Record<string, unknown>>) {
    const rawSeg = String(r.seg ?? '(none)')
    const key    = dim === 'channel' ? OTA_LABEL[mapSource(rawSeg)] : rawSeg
    const win    = String(r.win) === 'cur' ? 'cur' : 'prev'
    const reviews = num(r.reviews)
    const avg     = numOrNull(r.avg_rating)
    const five    = numOrNull(r.five_star_rate)

    const entry = segs.get(key) ?? { cur: empty(), prev: empty() }
    const slot  = entry[win]
    slot.reservations += num(r.reservations)
    slot.reviews      += reviews
    if (avg != null && reviews > 0) { slot.ratingSum += avg * reviews; slot.ratingN += reviews }
    if (five != null && reviews > 0) { slot.fiveN += five * reviews }
    segs.set(key, entry)
  }

  const avgOf  = (s: Slot): number | null => (s.ratingN > 0 ? s.ratingSum / s.ratingN : null)
  const rateOf = (s: Slot): number | null => (s.reservations > 0 ? s.reviews / s.reservations : null)
  const fiveOf = (s: Slot): number | null => (s.reviews > 0 ? s.fiveN / s.reviews : null)

  // Portfolio current-window avg (review-weighted) for outlier comparison.
  let portRatingSum = 0, portRatingN = 0, totalReviews = 0
  for (const { cur } of Array.from(segs.values())) {
    totalReviews += cur.reviews
    if (cur.ratingN > 0) { portRatingSum += cur.ratingSum; portRatingN += cur.ratingN }
  }
  const portAvg = portRatingN > 0 ? portRatingSum / portRatingN : null

  const out: CohortSegmentRow[] = []
  for (const [key, { cur, prev }] of Array.from(segs.entries())) {
    const avgRating = avgOf(cur)
    const reviewRate = rateOf(cur)
    const isOutlier =
      avgRating != null && portAvg != null &&
      cur.reviews >= OUTLIER_MIN_REVIEWS &&
      portAvg - avgRating >= OUTLIER_RATING_GAP

    let assessment: string | null = null
    if (isOutlier && avgRating != null && portAvg != null) {
      const ratePct = reviewRate != null ? ` (${Math.round(reviewRate * 100)}% review rate)` : ''
      assessment =
        `${key} ${avgRating.toFixed(2)} vs portfolio ${portAvg.toFixed(2)} — ` +
        `${cur.reviews} review${cur.reviews === 1 ? '' : 's'} from ${cur.reservations} checkout${cur.reservations === 1 ? '' : 's'}${ratePct}.`
    }

    out.push({
      key,
      reservations:   cur.reservations,
      reviews:        cur.reviews,
      reviewRate,
      avgRating,
      fiveStarRate:   fiveOf(cur),
      reviewShare:    totalReviews > 0 ? cur.reviews / totalReviews : null,
      prevReviewRate: rateOf(prev),
      prevAvgRating:  avgOf(prev),
      isOutlier,
      assessment,
    })
  }

  // Most reviews first; empty segments sink.
  out.sort((a, b) => b.reviews - a.reviews)
  return out
}
