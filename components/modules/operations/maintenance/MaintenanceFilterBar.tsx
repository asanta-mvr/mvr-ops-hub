'use client'

// Filter bar for the Maintenance Report v2 module. Mirrors
// `components/modules/customer-success/reviews/ReviewsFilterBar.tsx`:
//   - Draft state — selections only commit to the URL when the user clicks
//     Search. Keeps the dashboard from re-querying on every checkbox.
//   - URL prefix isolation — each tab passes its own prefix so the eight
//     tabs hold independent filter state side by side in the same URL.
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import {
  Activity,
  AlertCircle,
  Building2,
  Calendar,
  CreditCard,
  Search as SearchIcon,
  Wrench,
  X,
} from 'lucide-react'
import { MultiSelectFilter } from '@/components/modules/customer-success/chargebacks/MultiSelectFilter'
import { MAINTENANCE_PARAM_SUFFIXES } from '@/lib/maintenance/filters'

interface Props {
  prefix:           string
  years:            number[]
  statuses:         string[]
  priorities:       string[]
  subdepartments:   string[]
  buildings:        string[]
  billTos:          string[]
  q:                string | undefined
  yearOptions:      number[]
  statusOptions:    string[]
  priorityOptions:  string[]
  subdeptOptions:   string[]
  buildingOptions:  string[]
  billToOptions:    string[]
  ownedSuffixes?:   readonly string[]
}

function titleCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const STATUS_LABELS: Record<string, string> = {
  new:         'New',
  in_progress: 'In progress',
  finished:    'Finished',
  unknown:     'Unknown',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s.toLowerCase()] ?? titleCase(s)
}

export function MaintenanceFilterBar({
  prefix,
  years,
  statuses,
  priorities,
  subdepartments,
  buildings,
  billTos,
  q,
  yearOptions,
  statusOptions,
  priorityOptions,
  subdeptOptions,
  buildingOptions,
  billToOptions,
  ownedSuffixes = MAINTENANCE_PARAM_SUFFIXES,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  const [draftYears,      setDraftYears]      = useState<number[]>(years)
  const [draftStatuses,   setDraftStatuses]   = useState<string[]>(statuses)
  const [draftPriorities, setDraftPriorities] = useState<string[]>(priorities)
  const [draftSubdepts,   setDraftSubdepts]   = useState<string[]>(subdepartments)
  const [draftBuildings,  setDraftBuildings]  = useState<string[]>(buildings)
  const [draftBillTos,    setDraftBillTos]    = useState<string[]>(billTos)
  const [draftQ,          setDraftQ]          = useState<string>(q ?? '')

  useEffect(() => { setDraftYears(years) },                 [years.join(',')])
  useEffect(() => { setDraftStatuses(statuses) },           [statuses.join(',')])
  useEffect(() => { setDraftPriorities(priorities) },       [priorities.join(',')])
  useEffect(() => { setDraftSubdepts(subdepartments) },     [subdepartments.join(',')])
  useEffect(() => { setDraftBuildings(buildings) },         [buildings.join(',')])
  useEffect(() => { setDraftBillTos(billTos) },             [billTos.join(',')])
  useEffect(() => { setDraftQ(q ?? '') },                   [q])

  const hasPendingChanges = useMemo(() => {
    return (
      draftYears.join(',')      !== years.join(',')          ||
      draftStatuses.join(',')   !== statuses.join(',')       ||
      draftPriorities.join(',') !== priorities.join(',')     ||
      draftSubdepts.join(',')   !== subdepartments.join(',') ||
      draftBuildings.join(',')  !== buildings.join(',')      ||
      draftBillTos.join(',')    !== billTos.join(',')        ||
      (draftQ || '')            !== (q || '')
    )
  }, [draftYears, draftStatuses, draftPriorities, draftSubdepts, draftBuildings, draftBillTos, draftQ,
      years, statuses, priorities, subdepartments, buildings, billTos, q])

  const hasAnyFilter =
    draftYears.length      > 0 ||
    draftStatuses.length   > 0 ||
    draftPriorities.length > 0 ||
    draftSubdepts.length   > 0 ||
    draftBuildings.length  > 0 ||
    draftBillTos.length    > 0 ||
    draftQ.trim().length   > 0

  function currentParams(): URLSearchParams {
    return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  }

  function applyFilters() {
    const params = currentParams()
    for (const suffix of ownedSuffixes) params.delete(`${prefix}${suffix}`)
    if (draftYears.length      > 0) params.set(`${prefix}year`,     draftYears.map(String).join(','))
    if (draftStatuses.length   > 0) params.set(`${prefix}status`,   draftStatuses.join(','))
    if (draftPriorities.length > 0) params.set(`${prefix}priority`, draftPriorities.join(','))
    if (draftSubdepts.length   > 0) params.set(`${prefix}subdept`,  draftSubdepts.join(','))
    if (draftBuildings.length  > 0) params.set(`${prefix}building`, draftBuildings.join(','))
    if (draftBillTos.length    > 0) params.set(`${prefix}billto`,   draftBillTos.join(','))
    const qTrimmed = draftQ.trim()
    if (qTrimmed.length > 0) params.set(`${prefix}q`, qTrimmed)

    const qs = params.toString()
    startTransition(() => router.push(qs.length > 0 ? `${pathname}?${qs}` : pathname))
  }

  function clearAll() {
    setDraftYears([])
    setDraftStatuses([])
    setDraftPriorities([])
    setDraftSubdepts([])
    setDraftBuildings([])
    setDraftBillTos([])
    setDraftQ('')
    const params = currentParams()
    for (const suffix of ownedSuffixes) params.delete(`${prefix}${suffix}`)
    const qs = params.toString()
    startTransition(() => router.push(qs.length > 0 ? `${pathname}?${qs}` : pathname))
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-3 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <MultiSelectFilter
          icon={Calendar} allLabel="All years" itemNoun="year" ariaLabel="Filter by year"
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          selected={draftYears.map(String)}
          onChange={(next) => setDraftYears(next.map(Number).filter(Number.isFinite))}
        />

        <MultiSelectFilter
          icon={Activity} allLabel="All statuses" itemNoun="status" ariaLabel="Filter by status"
          options={statusOptions.map((s) => ({ value: s, label: statusLabel(s) }))}
          selected={draftStatuses} onChange={setDraftStatuses}
        />

        <MultiSelectFilter
          icon={AlertCircle} allLabel="All priorities" itemNoun="priority" ariaLabel="Filter by priority"
          options={priorityOptions.map((p) => ({ value: p, label: titleCase(p) }))}
          selected={draftPriorities} onChange={setDraftPriorities}
        />

        <MultiSelectFilter
          icon={Wrench} allLabel="All subdepartments" itemNoun="subdept" ariaLabel="Filter by subdepartment"
          options={subdeptOptions.map((s) => ({ value: s, label: s }))}
          selected={draftSubdepts} onChange={setDraftSubdepts}
        />

        <MultiSelectFilter
          icon={Building2} allLabel="All buildings" itemNoun="building" ariaLabel="Filter by building"
          options={buildingOptions.map((b) => ({ value: b, label: b }))}
          selected={draftBuildings} onChange={setDraftBuildings}
        />

        <MultiSelectFilter
          icon={CreditCard} allLabel="All bill-to" itemNoun="bill-to" ariaLabel="Filter by bill-to"
          options={billToOptions.map((b) => ({ value: b, label: titleCase(b) }))}
          selected={draftBillTos} onChange={setDraftBillTos}
        />

        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text" value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') applyFilters() }}
            placeholder="Search task name or description…"
            className="pl-7 pr-2 py-1.5 text-sm rounded-md border border-[#E0DBD4] bg-white w-56 focus:ring-mvr-primary/20 focus:border-mvr-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {hasAnyFilter ? (
            <button type="button" onClick={clearAll} disabled={isPending}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs text-mvr-primary hover:text-mvr-primary/80 disabled:opacity-50">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          ) : null}
          <button type="button" onClick={applyFilters} disabled={isPending || !hasPendingChanges}
            className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-md bg-mvr-primary text-white hover:bg-mvr-primary/90 disabled:opacity-50">
            <SearchIcon className="w-4 h-4" />
            {isPending ? 'Searching…' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  )
}
