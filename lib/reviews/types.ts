// Shared types + Zod schemas for the Reviews module.
// Consumed by `lib/reviews/bq.ts`, `lib/reviews/actions.ts`, the API routes
// under `app/api/v1/reviews/*`, and the client components.
import { z } from 'zod'
import type { OtaSource } from '@prisma/client'

// ── Status workflow (mirror of the Prisma enum so the client doesn't have to
//    import from @prisma/client). Keep in sync with ReviewActionStatus.
export const REVIEW_ACTION_STATUSES = [
  'new',
  'under_review',
  'no_action',
  'disputing',
  'dispute_won',
  'dispute_lost',
  'closed_no_change',
] as const
export type ReviewActionStatus = (typeof REVIEW_ACTION_STATUSES)[number]

export const TERMINAL_STATUSES = new Set<ReviewActionStatus>([
  'no_action',
  'dispute_won',
  'dispute_lost',
  'closed_no_change',
])

// ── BQ row shape (post-unwrap of {value: …} BQ date envelopes) ────────────
export interface ReviewRow {
  id:               string         // BQ reviews.id — UUID
  otaSource:        OtaSource      // derived from channel_name via mapOta()
  channelName:      string         // raw BQ channel_name, e.g. "Booking.com"
  rating:           number | null  // 1–5 or null
  date:             string         // 'YYYY-MM-DD'
  updatedAt:        string         // ISO timestamp
  title:            string | null
  description:      string | null
  guestName:        string | null
  hostResponded:    boolean
  hostResponseText: string | null
  positiveTags:     string[]
  negativeTags:     string[]
  unitName:         string | null   // "Icon 4407"
  buildingPrefix:   string | null   // "Icon"
  unitProviderId:   string | null
  reviewOf:         string | null
  displayOnWebsite: boolean
  /** Booking confirmation / reservation id from the OTA. Often null on
   *  Revaboard import — surfaced in the detail modal when present. */
  reservationId:    string | null
}

// ── Unit-level summary (used by the review detail modal) ──────────────────
// Snapshot of a single unit's review history — total volume, per-OTA mix,
// and star distribution. Always reads the full history of the unit (ignores
// the page-level scope) so the modal gives unit-wide context.
export interface UnitSummary {
  unitName:      string
  totalReviews:  number
  avgRating:     number | null
  byOta:         Array<{ otaSource: OtaSource; count: number; avgRating: number | null }>
  ratingBuckets: Record<'1' | '2' | '3' | '4' | '5', number>
}

export interface ReviewActionRow {
  id:                    string
  otaSource:             OtaSource
  externalReviewId:      string
  status:                ReviewActionStatus
  assignedToId:          string | null
  assignedToName:        string | null
  disputeDecision:       string | null
  disputeOutcomeNote:    string | null
  internalNotes:         string | null
  escalatedAt:           string | null
  escalatedById:         string | null
  escalatedSlackChannel: string | null
  firstActionedAt:       string | null
  closedAt:              string | null
  /** 0.0–1.0 — populated by the n8n auto-scorer in Phase 3. `null` until scored. */
  disputeScore:          number | null
  /** Structured payload from the AI scorer — criteria + reasoning. `null` until scored. */
  disputeAnalysis:       unknown
  /** Short human-readable verdict, e.g. "Dispute" / "Borderline" / "Don't dispute". */
  aiRecommendation:      string | null
  createdAt:             string
  updatedAt:             string
}

// Merged row sent to the client: BQ review + optional ops-hub action state.
export interface ReviewWithAction extends ReviewRow {
  action: ReviewActionRow | null
}

// ── KPI summary shape ─────────────────────────────────────────────────────
export interface ReviewsSummary {
  totalReviews:    number
  avgRating:       number | null
  ratingBuckets:   Record<'1' | '2' | '3' | '4' | '5', number>
  byOta:           Array<{ otaSource: OtaSource; count: number; avgRating: number | null }>
  byBuilding:      Array<{ buildingPrefix: string; count: number; avgRating: number | null }>
  lowRatingCount:  number // rating < 3
  midRatingCount:  number // rating >= 3 AND rating < 4
  /** Share of reviews with rating = 5, in [0,1]. `null` when totalReviews is 0. Target ≥ 0.90. */
  fiveStarRate:    number | null
  /** Share of reviews where host_response = TRUE, in [0,1]. `null` when totalReviews is 0. */
  responseRate:    number | null
  etlLoadedAt:     string | null // most recent etl_loaded_at across the filtered set
}

export interface ReviewsMonthlyPoint {
  month:     string  // 'YYYY-MM'
  count:     number
  avgRating: number | null
}

export interface ReviewsFilterOptions {
  buildings: string[]
  /** All unit_names. The filter bar slices these by selected buildings (prefix match). */
  units:     string[]
  otas:      OtaSource[]
  years:     number[]
  /** Distinct (year, month) combos present in the data. The filter bar slices
   *  the month dropdown by the selected year(s) so only months that actually
   *  have reviews are offered (e.g. 2026 → Jan..Jun, never future months). */
  yearMonths: Array<{ year: number; month: number }>
}

// ── Phase 2 aggregate shapes (heatmap + daily volume + tag treemap) ───────

/** Row dimension for the metric heatmap. */
export const HEATMAP_ROW_DIMS = ['building', 'channel', 'rating'] as const
export type HeatmapRowDim = (typeof HEATMAP_ROW_DIMS)[number]

/** Column dimension for the metric heatmap. */
export const HEATMAP_COL_DIMS = ['day', 'week', 'month', 'year'] as const
export type HeatmapColDim = (typeof HEATMAP_COL_DIMS)[number]

export interface HeatmapRow {
  /** Row label — building name, channel name, or rating value (as string). */
  row:       string
  /** Column bucket — 'YYYY-MM-DD' (day), 'YYYY-Www' (ISO week), 'YYYY-MM' (month), or 'YYYY' (year). */
  col:       string
  avgRating: number | null
  count:     number
}

export interface DailyVolumePoint {
  date:      string // 'YYYY-MM-DD'
  /** OtaSource bucket for this row. Multiple rows per date (one per channel)
   *  let the chart render both an Overall line and a per-channel breakdown
   *  without a second query. */
  channel:   OtaSource
  count:     number
  /** AVG(rating) for (date, channel). `null` when every review on that day
   *  for that channel had no rating. The chart computes a *weighted* average
   *  when aggregating daily points up to weeks or months. */
  avgRating: number | null
}

export interface TagDistRow {
  kind:  'positive' | 'negative'
  tag:   string
  count: number
}

// ── Performance tab: checkout-cohort analytics ────────────────────────────
//
// The Performance tab answers the COO's L10 feedback. Volume / review-rate /
// quality are computed on a **checkout cohort**: reviews from
// `ops.ops_reviews_processed` joined to `ops.ops_reservations` on
// `reservation_id`, both anchored on `check_out_date_localized`. Reads as
// "of guests who checked out in week W, X% left a review, averaging Y★."
// (See lib/reviews/cohort.ts.) Tags + response rate stay on `reva_reviews`
// by publish date (see lib/reviews/bq.ts) — those are theme/ops metrics.

/** One ISO week of the checkout-cohort trend (Weekly Pulse — PDF page 2). */
export interface CohortWeekPoint {
  isoWeek:      string         // 'YYYY-Www' (ISO year + ISO week)
  weekStart:    string         // 'YYYY-MM-DD' — Monday of the ISO week
  reservations: number         // confirmed guest stays checking out that week
  reviews:      number         // those stays that have a review
  /** reviews / reservations, in [0,1]. `null` when reservations = 0. */
  reviewRate:   number | null
  avgRating:    number | null  // AVG over reviewed stays (normalized to 1–5)
  /** Share of reviewed stays rated ≥ 5, in [0,1]. `null` when reviews = 0. */
  fiveStarRate: number | null
  /** Checkout week too recent — reviews still arrive 1–3 weeks post-stay, so
   *  the rate under-counts. The UI dims these and labels them "still maturing." */
  maturing:     boolean
}

/** One segment (channel or building) of the cohort, current window + trend vs
 *  the prior equal-length window + outlier flag (Segment Performance — page 3). */
export interface CohortSegmentRow {
  key:          string         // OtaSource label (channel dim) or building name
  reservations: number
  reviews:      number
  reviewRate:   number | null
  avgRating:    number | null
  fiveStarRate: number | null
  /** Share of the window's reviews this segment holds, in [0,1]. */
  reviewShare:  number | null
  prevReviewRate: number | null // prior equal-length window — drives the trend arrow
  prevAvgRating:  number | null
  /** True when avgRating deviates from the portfolio avg beyond the threshold. */
  isOutlier:    boolean
  /** Deterministic, data-derived "why" sentence for an outlier; `null` otherwise. */
  assessment:   string | null
}

export const COHORT_SEGMENT_DIMS = ['channel', 'building'] as const
export type CohortSegmentDim = (typeof COHORT_SEGMENT_DIMS)[number]

/** Weekly response-rate point (reva_reviews, publish date — page 2, 5th metric). */
export interface WeeklyResponsePoint {
  isoWeek:      string
  weekStart:    string
  reviews:      number          // reviews received that week
  responseRate: number | null   // share with host_response = TRUE
}

/** A positive tag whose share rose vs the trailing baseline (Emerging
 *  Strengths — page 4). Rule-based, no AI. reva_reviews by publish date. */
export interface EmergingStrength {
  tag:           string
  currentCount:  number
  /** Share of positive-tag mentions in the current window, in [0,1]. */
  currentShare:  number
  baselineShare: number
  /** currentShare − baselineShare; positive = rising. */
  delta:         number
}

/** A negative theme with gravity metrics (Pain Points — page 5, analytics
 *  half). reva_reviews by publish date. Remediation status is deferred to
 *  the Support Tickets system. */
export interface PainPointRow {
  tag:              string
  reviews:          number          // reviews citing this tag (current window)
  guests:           number          // distinct guests citing it
  /** Share of citing reviews rated < 5, in [0,1]. `null` when none cite it. */
  belowFiveStarPct: number | null
  /** Share of all reviews in the window that cite this tag, in [0,1]. */
  sharePct:         number | null
  prevReviews:      number          // prior equal-length window — trend arrow
}

// ── Disputes-tab stats (Postgres-side) ────────────────────────────────────

export interface DisputeStats {
  disputingNow: number
  wonYtd:       number
  lostYtd:      number
  closedYtd:    number
  /** wonYtd / (wonYtd + lostYtd); `null` when neither has any. */
  winRate:      number | null
  /** Share of all reviews that have entered the dispute pipeline at some point. */
  disputedPct:  number | null
}

// ── Filter Zod schema (used by API routes + search-param parser) ──────────
//
// Internal-only fields (`dateFrom`/`dateTo`) are kept so the cell-drill-down
// endpoint can layer a date range on top of the URL filters server-side.
// They are NOT parsed from URL params anymore (see lib/reviews/filters.ts).

export const reviewFiltersSchema = z.object({
  /** Multi-select OtaSource enum values. */
  otas:       z.array(z.string()).default([]),
  /** Multi-select building prefix (e.g. "Icon"). Matches `unit_name LIKE 'Icon %'`. */
  buildings:  z.array(z.string()).default([]),
  /** Multi-select exact `unit_name` (e.g. "Icon 4407"). Cascades from buildings. */
  units:      z.array(z.string()).default([]),
  /** Multi-select integer star ratings 1..5. */
  stars:      z.array(z.number().int().min(1).max(5)).default([]),
  /** Multi-select year filter — translated to EXTRACT(YEAR FROM date) IN (...). */
  years:      z.array(z.number().int().min(2000).max(2100)).default([]),
  /** Multi-select month filter (1=Jan..12=Dec) — translated to EXTRACT(MONTH FROM date) IN (...). */
  months:     z.array(z.number().int().min(1).max(12)).default([]),
  /** Free-text fragment matched against BigQuery `unit_name` (e.g. "1906" or "Icon"). */
  unitSearch: z.string().trim().min(1).max(80).optional(),
  /** Internal-only — used by the cell-drill-down endpoint, not URL-bound. */
  dateFrom:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Internal-only — used by the cell-drill-down endpoint, not URL-bound. */
  dateTo:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page:       z.number().int().min(0).default(0),
  pageSize:   z.number().int().min(1).max(200).default(50),
})

export type ReviewFilters = z.infer<typeof reviewFiltersSchema>

// ── Action upsert payload ────────────────────────────────────────────────
export const reviewActionPatchSchema = z.object({
  otaSource:          z.enum(['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']),
  externalReviewId:   z.string().min(1),
  status:             z.enum(REVIEW_ACTION_STATUSES).optional(),
  assignedToId:       z.string().nullable().optional(),
  disputeDecision:    z.string().nullable().optional(),
  disputeOutcomeNote: z.string().nullable().optional(),
  internalNotes:      z.string().nullable().optional(),
})
export type ReviewActionPatch = z.infer<typeof reviewActionPatchSchema>
