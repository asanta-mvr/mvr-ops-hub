// Parse the dashboard page's searchParams into a typed ReviewFilters object.
// Same job as `splitCsv` + manual coercion in chargebacks/page.tsx, scoped to
// Reviews and passed through the Zod schema so bad URL input degrades safely.
//
// The URL surface is intentionally narrow:
//   year=YYYY[,YYYY…]      multi-select year filter
//   building=Icon[,Elser…] multi-select building prefix
//   unit=Icon%204407[,…]   multi-select exact unit_name match
//   ota=airbnb[,booking…]  multi-select OtaSource enum
//   stars=4,5              multi-select rating values (1..5)
//   q=text                 unit-name fragment search (Performance tab)
//   page=N pageSize=N      pagination
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

export interface ReviewsSearchParams {
  year?:     string
  building?: string
  unit?:     string
  ota?:      string
  stars?:    string
  q?:        string
  page?:     string
  pageSize?: string
}

export function parseReviewFilters(sp: ReviewsSearchParams): ReviewFilters {
  const yearsRaw = splitCsv(sp.year)
    .map((y) => Number(y))
    .filter((y) => Number.isInteger(y) && y >= 2000 && y <= 2100)

  const starsRaw = splitCsv(sp.stars)
    .map((s) => Number(s))
    .filter((s) => Number.isInteger(s) && s >= 1 && s <= 5)

  const parsed = reviewFiltersSchema.safeParse({
    otas:       splitCsv(sp.ota),
    buildings:  splitCsv(sp.building),
    units:      splitCsv(sp.unit),
    stars:      starsRaw,
    years:      yearsRaw,
    unitSearch: sp.q,
    page:       sp.page ? Number(sp.page) : 0,
    pageSize:   sp.pageSize ? Number(sp.pageSize) : 50,
  })

  // Bad input degrades to defaults — never throws on the page render path.
  if (!parsed.success) return reviewFiltersSchema.parse({})
  return parsed.data
}
