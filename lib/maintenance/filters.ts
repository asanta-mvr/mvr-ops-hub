// Translate Next.js searchParams into a typed `MaintenanceFilters` object.
// Mirrors `lib/reviews/filters.ts` — same shape (CSV multi-select keys, an
// optional prefix to keep tabs' filter state isolated in the URL).
//
// URL surface per tab (prefix `ov_` / `cost_` / `bld_` / `guest_` / `team_` / `rec_`):
//   {prefix}year=YYYY[,YYYY…]                multi-select year
//   {prefix}status=finished[,pending,…]      status stage multi
//   {prefix}priority=urgent[,normal]         priority multi
//   {prefix}building=Icon[,Elser,…]          building multi (Unassigned matches no-reservation bucket)
//   {prefix}billto=owner[,guest,mvr]         bill_to multi
//   {prefix}q=text                           free-text on task name
//   {prefix}dateFrom=YYYY-MM-DD              drill-down only
//   {prefix}dateTo=YYYY-MM-DD                drill-down only
//   {prefix}tech=123[,456,…]                 creator employee_id multi (URL-only)
//   {prefix}costType=labor[,material]        cost-type multi (URL-only)
//   {prefix}page=N {prefix}pageSize=N        pagination
import {
  maintenanceFiltersSchema,
  type MaintenanceFilters,
} from './types'

function splitCsv(v: string | undefined): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
}

// Next.js App Router gives values as `string | string[] | undefined`. The
// filter bar always writes a single value; tolerate arrays defensively.
export type MaintenanceSearchParams = Record<string, string | string[] | undefined>

function readOne(sp: MaintenanceSearchParams, key: string): string | undefined {
  const v = sp[key]
  if (v == null) return undefined
  return Array.isArray(v) ? v[0] : v
}

function readIntCsv(v: string | undefined): number[] {
  return splitCsv(v)
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n))
}

export function parseMaintenanceFilters(
  sp: MaintenanceSearchParams,
  prefix = '',
): MaintenanceFilters {
  const k = (suffix: string) => `${prefix}${suffix}`

  const yearsRaw = readIntCsv(readOne(sp, k('year')))
    .filter((y) => y >= 2000 && y <= 2100)

  const techniciansRaw = readIntCsv(readOne(sp, k('tech')))

  const pageRaw     = readOne(sp, k('page'))
  const pageSizeRaw = readOne(sp, k('pageSize'))

  const parsed = maintenanceFiltersSchema.safeParse({
    years:       yearsRaw,
    statuses:    splitCsv(readOne(sp, k('status'))),
    priorities:     splitCsv(readOne(sp, k('priority'))),
    subdepartments: splitCsv(readOne(sp, k('subdept'))),
    buildings:      splitCsv(readOne(sp, k('building'))),
    billTos:        splitCsv(readOne(sp, k('billto'))),
    q:           readOne(sp, k('q')),
    dateFrom:    readOne(sp, k('dateFrom')),
    dateTo:      readOne(sp, k('dateTo')),
    technicians: techniciansRaw,
    costTypes:   splitCsv(readOne(sp, k('costType'))),
    page:        pageRaw     ? Number(pageRaw)     : 0,
    pageSize:    pageSizeRaw ? Number(pageSizeRaw) : 50,
  })

  if (!parsed.success) return maintenanceFiltersSchema.parse({})
  return parsed.data
}

// Re-export the tab prefixes for the page parser + redirect-to-defaults logic.
// Source of truth lives in `./types` so all consumers stay aligned.
export {
  MAINTENANCE_TAB_PREFIXES,
  type MaintenanceTabPrefix,
} from './types'

// URL suffixes exposed so the page can check whether ANY filter key (across
// all tabs) is present before redirecting to the canonical default scope.
export const MAINTENANCE_PARAM_SUFFIXES = [
  'year',
  'status',
  'priority',
  'subdept',
  'building',
  'billto',
  'q',
  'dateFrom',
  'dateTo',
  'tech',
  'costType',
  'page',
  'pageSize',
] as const

// Flat (un-prefixed) query string built from a parsed filter set. Used when a
// drill-down panel calls an `/api/v1/maintenance/*` endpoint — the API reads
// un-prefixed keys, so we strip whichever tab prefix the page used.
export function buildScopeQs(filters: MaintenanceFilters): string {
  const qs = new URLSearchParams()
  if (filters.years.length       > 0) qs.set('year',     filters.years.map(String).join(','))
  if (filters.statuses.length    > 0) qs.set('status',   filters.statuses.join(','))
  if (filters.priorities.length     > 0) qs.set('priority', filters.priorities.join(','))
  if (filters.subdepartments.length > 0) qs.set('subdept',  filters.subdepartments.join(','))
  if (filters.buildings.length      > 0) qs.set('building', filters.buildings.join(','))
  if (filters.billTos.length     > 0) qs.set('billto',   filters.billTos.join(','))
  if (filters.q)                      qs.set('q',        filters.q)
  if (filters.dateFrom)               qs.set('dateFrom', filters.dateFrom)
  if (filters.dateTo)                 qs.set('dateTo',   filters.dateTo)
  if (filters.technicians.length > 0) qs.set('tech',     filters.technicians.map(String).join(','))
  if (filters.costTypes.length   > 0) qs.set('costType', filters.costTypes.join(','))
  return qs.toString()
}
