// Builds the typed payload for the Monday-morning Reviews brief. Single
// source of truth for both the HTML preview page (rendered by puppeteer)
// and any future direct consumers — so the on-screen brief and the PDF
// never diverge.
//
// Window: last completed Mon → Sun (in UTC). Prior week is the 7 days
// immediately before that, for delta computation.
import {
  fetchLatestForBucket,
  fetchReviewsKPIs,
  fetchTagDistribution,
} from './bq'
import { getDisputeStats } from './actions'
import type {
  DisputeStats,
  ReviewFilters,
  ReviewRow,
  ReviewsSummary,
  TagDistRow,
} from './types'

// Buildings MVR currently manages. Matches the dashboard's default redirect
// scope in app/(dashboard)/customer-success/reviews/page.tsx.
const MANAGED_BUILDINGS = ['Arya', 'District', 'Elser', 'Icon', 'Natiivo'] as const

export interface WeeklyBriefPayload {
  /** Generation timestamp, ISO. Useful for the footer + cache busting. */
  generatedAt:  string
  scope:        { dateFrom: string; dateTo: string; buildings: string[] }
  priorScope:   { dateFrom: string; dateTo: string }
  current:      ReviewsSummary
  prior:        ReviewsSummary
  disputeStats: DisputeStats
  latestGood:   ReviewRow[]  // ≥ 4★, top 3
  latestBad:    ReviewRow[]  // ≤ 3★, top 3
  topTagsPos:   TagDistRow[] // top 5 positive
  topTagsNeg:   TagDistRow[] // top 5 negative
}

// ── Date helpers (UTC) ────────────────────────────────────────────────────

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Returns the Monday → Sunday range that ended *before* `now` (UTC). When
 *  fired on Monday 8am ET (Mon 13:00 UTC) this returns last week's Mon–Sun. */
export function lastWeekRange(now: Date): { dateFrom: string; dateTo: string } {
  const utcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const day = utcMidnight.getUTCDay() // 0=Sun..6=Sat
  // Days back to get to *this* week's Monday (Mon→0, Tue→1, …, Sun→6).
  const daysFromMonday = (day + 6) % 7
  const thisMonday = new Date(utcMidnight)
  thisMonday.setUTCDate(thisMonday.getUTCDate() - daysFromMonday)
  // Last week: Mon (= thisMonday - 7d) through Sun (= thisMonday - 1d).
  const lastMonday = new Date(thisMonday); lastMonday.setUTCDate(lastMonday.getUTCDate() - 7)
  const lastSunday = new Date(thisMonday); lastSunday.setUTCDate(lastSunday.getUTCDate() - 1)
  return { dateFrom: toIsoDate(lastMonday), dateTo: toIsoDate(lastSunday) }
}

/** Given the current week range, return the prior 7-day window. */
export function priorWeekRange(current: { dateFrom: string; dateTo: string }): { dateFrom: string; dateTo: string } {
  const from = new Date(current.dateFrom + 'T00:00:00Z')
  const prevTo   = new Date(from);   prevTo.setUTCDate(prevTo.getUTCDate() - 1)
  const prevFrom = new Date(prevTo); prevFrom.setUTCDate(prevFrom.getUTCDate() - 6)
  return { dateFrom: toIsoDate(prevFrom), dateTo: toIsoDate(prevTo) }
}

// ── Filter factory ────────────────────────────────────────────────────────

function filtersFor(range: { dateFrom: string; dateTo: string }): ReviewFilters {
  return {
    otas:      [],
    buildings: [...MANAGED_BUILDINGS],
    units:     [],
    stars:     [],
    years:     [],
    months:    [],
    dateFrom:  range.dateFrom,
    dateTo:    range.dateTo,
    page:      0,
    pageSize:  50,
  }
}

// ── Public entry point ────────────────────────────────────────────────────

export async function buildWeeklyBrief(now: Date = new Date()): Promise<WeeklyBriefPayload> {
  const scope      = lastWeekRange(now)
  const priorScope = priorWeekRange(scope)

  const currentFilters = filtersFor(scope)
  const priorFilters   = filtersFor(priorScope)

  const [
    current,
    prior,
    disputeStats,
    latestGood,
    latestBad,
    tagDistribution,
  ] = await Promise.all([
    fetchReviewsKPIs(currentFilters),
    fetchReviewsKPIs(priorFilters),
    getDisputeStats(),
    fetchLatestForBucket(currentFilters, { ratingGte: 4, limit: 3 }),
    fetchLatestForBucket(currentFilters, { ratingLte: 3, limit: 3 }),
    fetchTagDistribution(currentFilters),
  ])

  const topTagsPos = tagDistribution
    .filter((t) => t.kind === 'positive')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const topTagsNeg = tagDistribution
    .filter((t) => t.kind === 'negative')
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    generatedAt:  new Date().toISOString(),
    scope:        { ...scope, buildings: [...MANAGED_BUILDINGS] },
    priorScope,
    current,
    prior,
    disputeStats,
    latestGood,
    latestBad,
    topTagsPos,
    topTagsNeg,
  }
}
