// Parse the dashboard page's searchParams into a typed ReviewFilters object.
// Same job as `splitCsv` + manual coercion in chargebacks/page.tsx, scoped to
// Reviews and passed through the Zod schema so bad URL input degrades safely.
//
// The URL surface is intentionally narrow. Keys are optionally prefixed so the
// three tabs (Overview, Performance, Disputes) can hold independent filter
// state side-by-side in the same URL:
//   {prefix}year=YYYY[,YYYY…]      multi-select year filter
//   {prefix}building=Icon[,Elser…] multi-select building prefix
//   {prefix}unit=Icon%204407[,…]   multi-select exact unit_name match
//   {prefix}ota=airbnb[,booking…]  multi-select OtaSource enum
//   {prefix}stars=4,5              multi-select rating values (1..5)
//   {prefix}q=text                 unit-name fragment search (Performance tab)
//   {prefix}page=N pageSize=N      pagination
//
// Active prefixes: 'ov_' (Overview), 'pf_' (Performance), 'dp_' (Disputes).
// `prefix=''` (the default) keeps backwards compatibility for any code that
// still reads the un-namespaced surface (the /api/v1/reviews/* route handlers
// continue to do this — they're consumed by the heatmap drill-down panel and
// don't need the per-tab split).
//
// Anything else (rating pills, assignee, status, unassigned, raw from/to date
// inputs) was removed from the UI and is intentionally NOT parsed here so
// stale URLs left over from older builds don't keep filtering silently.
import {
  reviewFiltersSchema,
  type ReviewFilters,
} from './types'

function splitCsv(v: string | undefined): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
}

// Next.js App Router gives us values as string | string[] | undefined. The
// filter bar always writes a single value, but we tolerate arrays defensively
// in case someone constructs the URL by hand.
export type ReviewsSearchParams = Record<string, string | string[] | undefined>

function readOne(sp: ReviewsSearchParams, key: string): string | undefined {
  const v = sp[key]
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

export function parseReviewFilters(sp: ReviewsSearchParams, prefix = ''): ReviewFilters {
  const k = (suffix: string) => `${prefix}${suffix}`

  const yearsRaw = splitCsv(readOne(sp, k('year')))
    .map((y) => Number(y))
    .filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100)

  const starsRaw = splitCsv(readOne(sp, k('stars')))
    .map((s) => Number(s))
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= 5)

  const pageRaw     = readOne(sp, k('page'))
  const pageSizeRaw = readOne(sp, k('pageSize'))

  const parsed = reviewFiltersSchema.safeParse({
    otas:       splitCsv(readOne(sp, k('ota'))),
    buildings:  splitCsv(readOne(sp, k('building'))),
    units:      splitCsv(readOne(sp, k('unit'))),
    stars:      starsRaw,
    years:      yearsRaw,
    unitSearch: readOne(sp, k('q')),
    page:       pageRaw     ? Number(pageRaw)     : 0,
    pageSize:   pageSizeRaw ? Number(pageSizeRaw) : 50,
  })

  // Bad input degrades to defaults — never throws on the page render path.
  if (!parsed.success) return reviewFiltersSchema.parse({})
  return parsed.data
}

// Tab prefixes used across the page parser, redirect-to-defaults logic, and
// the per-tab filter bar instances.
export const REVIEWS_TAB_PREFIXES = ['ov_', 'pf_', 'dp_'] as const
export type ReviewsTabPrefix = (typeof REVIEWS_TAB_PREFIXES)[number]

// Suffixes the URL surface uses. Exposed so the page can check whether ANY
// filter key (across all three tabs) is present before redirecting to the
// canonical default scope.
export const REVIEWS_PARAM_SUFFIXES = ['year', 'building', 'unit', 'ota', 'stars', 'q', 'page', 'pageSize'] as const
