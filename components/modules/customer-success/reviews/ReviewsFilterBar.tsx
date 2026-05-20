'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Building2, Calendar, Home, Search as SearchIcon, Star, Tv, X } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import { MultiSelectFilter } from '@/components/modules/customer-success/chargebacks/MultiSelectFilter'

interface Props {
  /**
   * URL param prefix this filter bar owns — e.g. 'ov_' for Overview, 'pf_'
   * for Performance, 'dp_' for Disputes. Allows three independent filter
   * bars to coexist in the same URL without trampling each other.
   */
  prefix:          string
  years:           number[]
  buildings:       string[]
  units:           string[]
  otas:            OtaSource[]
  stars:           number[]
  yearOptions:     number[]
  buildingOptions: string[]
  unitOptions:     string[]
  otaOptions:      OtaSource[]
}

const OTA_LABELS: Record<OtaSource, string> = {
  airbnb:  'Airbnb',
  booking: 'Booking.com',
  vrbo:    'Vrbo',
  expedia: 'Expedia',
  vacasa:  'Vacasa',
  other:   'Other',
}

const STAR_VALUES = [5, 4, 3, 2, 1] as const

// Keys the bar owns within its prefix namespace. Used by clearAll() to wipe
// just this tab's params and by applyFilters() to know what to write.
const OWNED_SUFFIXES = ['year', 'building', 'unit', 'ota', 'stars', 'q', 'page', 'pageSize'] as const

export function ReviewsFilterBar({
  prefix,
  years,
  buildings,
  units,
  otas,
  stars,
  yearOptions,
  buildingOptions,
  unitOptions,
  otaOptions,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  // Draft state — selections are held locally and only committed to the URL
  // (which triggers the data fetch) when the user clicks "Search". This
  // prevents a query firing on every selection / deselection inside the
  // multi-select dropdowns.
  const [draftYears,     setDraftYears]     = useState<number[]>(years)
  const [draftBuildings, setDraftBuildings] = useState<string[]>(buildings)
  const [draftUnits,     setDraftUnits]     = useState<string[]>(units)
  const [draftOtas,      setDraftOtas]      = useState<OtaSource[]>(otas)
  const [draftStars,     setDraftStars]     = useState<number[]>(stars)

  // Re-sync draft from props whenever the applied (URL) filters change —
  // e.g. after a successful Search push, navigation, or external refresh.
  useEffect(() => { setDraftYears(years) },         [years.join(',')])
  useEffect(() => { setDraftBuildings(buildings) }, [buildings.join(',')])
  useEffect(() => { setDraftUnits(units) },         [units.join(',')])
  useEffect(() => { setDraftOtas(otas) },           [otas.join(',')])
  useEffect(() => { setDraftStars(stars) },         [stars.join(',')])

  // Cascading: when one or more buildings are selected in the draft, restrict
  // the Unit dropdown to units that belong to those buildings.
  const filteredUnitOptions = useMemo(() => {
    if (draftBuildings.length === 0) return unitOptions
    return unitOptions.filter((u) =>
      draftBuildings.some((b) => u === b || u.startsWith(`${b} `))
    )
  }, [unitOptions, draftBuildings])

  // Drop orphan units from the draft when the building selection shrinks.
  useEffect(() => {
    if (draftUnits.length === 0 || draftBuildings.length === 0) return
    const stillValid = draftUnits.filter((u) =>
      draftBuildings.some((b) => u === b || u.startsWith(`${b} `))
    )
    if (stillValid.length !== draftUnits.length) {
      setDraftUnits(stillValid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftBuildings.join(',')])

  const hasPendingChanges = useMemo(() => {
    return (
      draftYears.join(',')     !== years.join(',')     ||
      draftBuildings.join(',') !== buildings.join(',') ||
      draftUnits.join(',')     !== units.join(',')     ||
      draftOtas.join(',')      !== otas.join(',')      ||
      draftStars.join(',')     !== stars.join(',')
    )
  }, [draftYears, draftBuildings, draftUnits, draftOtas, draftStars, years, buildings, units, otas, stars])

  const hasAnyFilter =
    draftYears.length     > 0 ||
    draftBuildings.length > 0 ||
    draftUnits.length     > 0 ||
    draftOtas.length      > 0 ||
    draftStars.length     > 0

  function currentParams(): URLSearchParams {
    return new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
  }

  function applyFilters() {
    // Start from the live URL so we preserve OTHER tabs' filter params.
    const params = currentParams()

    // Wipe our owned suffixes, then set the active ones.
    for (const suffix of OWNED_SUFFIXES) params.delete(`${prefix}${suffix}`)
    if (draftYears.length     > 0) params.set(`${prefix}year`,     draftYears.map(String).join(','))
    if (draftBuildings.length > 0) params.set(`${prefix}building`, draftBuildings.join(','))
    if (draftUnits.length     > 0) params.set(`${prefix}unit`,     draftUnits.join(','))
    if (draftOtas.length      > 0) params.set(`${prefix}ota`,      draftOtas.join(','))
    if (draftStars.length     > 0) params.set(`${prefix}stars`,    draftStars.map(String).join(','))

    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  function clearAll() {
    setDraftYears([])
    setDraftBuildings([])
    setDraftUnits([])
    setDraftOtas([])
    setDraftStars([])
    // Only remove our owned keys — preserve the other tabs' state.
    const params = currentParams()
    for (const suffix of OWNED_SUFFIXES) params.delete(`${prefix}${suffix}`)
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-3 shadow-card flex flex-wrap items-center gap-2">
      <MultiSelectFilter
        icon={Calendar}
        allLabel="All years"
        itemNoun="year"
        ariaLabel="Filter by year"
        options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
        selected={draftYears.map(String)}
        onChange={(next) => setDraftYears(next.map((v) => Number(v)))}
      />

      <MultiSelectFilter
        icon={Building2}
        allLabel="All buildings"
        itemNoun="building"
        ariaLabel="Filter by building"
        options={buildingOptions.map((b) => ({ value: b, label: b }))}
        selected={draftBuildings}
        onChange={(next) => setDraftBuildings(next)}
      />

      <MultiSelectFilter
        icon={Home}
        allLabel={draftBuildings.length > 0 ? 'All units (in buildings)' : 'All units'}
        itemNoun="unit"
        ariaLabel="Filter by unit"
        options={filteredUnitOptions.map((u) => ({ value: u, label: u }))}
        selected={draftUnits}
        onChange={(next) => setDraftUnits(next)}
      />

      <MultiSelectFilter
        icon={Tv}
        allLabel="All channels"
        itemNoun="channel"
        ariaLabel="Filter by OTA channel"
        options={otaOptions.map((o) => ({ value: o, label: OTA_LABELS[o] }))}
        selected={draftOtas}
        onChange={(next) => setDraftOtas(next as OtaSource[])}
      />

      <MultiSelectFilter
        icon={Star}
        allLabel="All stars"
        itemNoun="star"
        ariaLabel="Filter by star rating"
        options={STAR_VALUES.map((s) => ({ value: String(s), label: `${s} ★` }))}
        selected={draftStars.map(String)}
        onChange={(next) => setDraftStars(next.map((v) => Number(v)))}
      />

      <span className="h-6 w-px bg-[#E0DBD4]" aria-hidden />

      <button
        type="button"
        onClick={applyFilters}
        disabled={!hasPendingChanges || isPending}
        className={`inline-flex items-center gap-1.5 text-xs rounded-md px-3 py-1.5 transition-colors ${
          hasPendingChanges
            ? 'bg-mvr-primary text-white hover:bg-mvr-primary/90'
            : 'bg-mvr-cream text-mvr-primary/40 cursor-not-allowed border border-[#E0DBD4]'
        }`}
        aria-label="Apply filters"
      >
        <SearchIcon className="w-3.5 h-3.5" />
        Search
      </button>

      {hasAnyFilter ? (
        <button
          type="button"
          onClick={clearAll}
          className="ml-auto inline-flex items-center gap-1 text-xs text-mvr-primary border border-[#E0DBD4] rounded-md px-2 py-1 hover:bg-mvr-cream"
        >
          Clear filters <X className="w-3 h-3" />
        </button>
      ) : null}
    </div>
  )
}
