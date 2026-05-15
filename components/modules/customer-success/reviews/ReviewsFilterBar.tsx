'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useMemo, useState, useTransition } from 'react'
import { Building2, Calendar, Home, Search, Star, Tv, X } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import { MultiSelectFilter } from '@/components/modules/customer-success/chargebacks/MultiSelectFilter'

interface Props {
  years:           number[]
  buildings:       string[]
  units:           string[]
  otas:            OtaSource[]
  stars:           number[]
  unitSearch?:     string
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

export function ReviewsFilterBar({
  years,
  buildings,
  units,
  otas,
  stars,
  unitSearch,
  yearOptions,
  buildingOptions,
  unitOptions,
  otaOptions,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  // Cascading: when one or more buildings are selected, restrict the Unit
  // dropdown to units that belong to those buildings (prefix match on
  // "<Building> <UnitNumber>"). With no buildings selected, show all units.
  const filteredUnitOptions = useMemo(() => {
    if (buildings.length === 0) return unitOptions
    return unitOptions.filter((u) =>
      buildings.some((b) => u === b || u.startsWith(`${b} `))
    )
  }, [unitOptions, buildings])

  // Local draft for the search input so typing doesn't fire a router push
  // on every keystroke. Committed on Enter / blur / explicit submit.
  const [searchDraft, setSearchDraft] = useState<string>(unitSearch ?? '')
  useEffect(() => { setSearchDraft(unitSearch ?? '') }, [unitSearch])

  function pushUpdate(updates: Record<string, string | null>) {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '' || value === undefined) params.delete(key)
      else params.set(key, value)
    }
    params.delete('page') // reset paging when scope changes
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  function setMultiCsv(key: string, next: string[]) {
    pushUpdate({ [key]: next.length === 0 ? null : next.join(',') })
  }

  function commitSearch() {
    const trimmed = searchDraft.trim()
    if (trimmed === (unitSearch ?? '')) return
    pushUpdate({ q: trimmed || null })
  }

  // If the user deselects a building, drop any selected units that no longer
  // belong to the remaining buildings. Otherwise the URL would silently keep
  // filtering by an orphan unit.
  useEffect(() => {
    if (units.length === 0 || buildings.length === 0) return
    const stillValid = units.filter((u) =>
      buildings.some((b) => u === b || u.startsWith(`${b} `))
    )
    if (stillValid.length !== units.length) {
      setMultiCsv('unit', stillValid)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings.join(',')])

  const hasAnyFilter =
    years.length     > 0 ||
    buildings.length > 0 ||
    units.length     > 0 ||
    otas.length      > 0 ||
    stars.length     > 0 ||
    Boolean(unitSearch && unitSearch.length > 0)

  function clearAll() {
    startTransition(() => router.push(pathname))
  }

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-3 shadow-card flex flex-wrap items-center gap-2">
      <MultiSelectFilter
        icon={Calendar}
        allLabel="All years"
        itemNoun="year"
        ariaLabel="Filter by year"
        options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
        selected={years.map(String)}
        onChange={(next) => setMultiCsv('year', next)}
      />

      <MultiSelectFilter
        icon={Building2}
        allLabel="All buildings"
        itemNoun="building"
        ariaLabel="Filter by building"
        options={buildingOptions.map((b) => ({ value: b, label: b }))}
        selected={buildings}
        onChange={(next) => setMultiCsv('building', next)}
      />

      <MultiSelectFilter
        icon={Home}
        allLabel={buildings.length > 0 ? 'All units (in buildings)' : 'All units'}
        itemNoun="unit"
        ariaLabel="Filter by unit"
        options={filteredUnitOptions.map((u) => ({ value: u, label: u }))}
        selected={units}
        onChange={(next) => setMultiCsv('unit', next)}
      />

      <MultiSelectFilter
        icon={Tv}
        allLabel="All channels"
        itemNoun="channel"
        ariaLabel="Filter by OTA channel"
        options={otaOptions.map((o) => ({ value: o, label: OTA_LABELS[o] }))}
        selected={otas}
        onChange={(next) => setMultiCsv('ota', next)}
      />

      <MultiSelectFilter
        icon={Star}
        allLabel="All stars"
        itemNoun="star"
        ariaLabel="Filter by star rating"
        options={STAR_VALUES.map((s) => ({ value: String(s), label: `${s} ★` }))}
        selected={stars.map(String)}
        onChange={(next) => setMultiCsv('stars', next)}
      />

      <span className="h-6 w-px bg-[#E0DBD4]" aria-hidden />

      {/* Unit search — accepts partial fragments like "1906" or "Icon". */}
      <div className="inline-flex items-center gap-1 rounded-md border border-[#E0DBD4] bg-white px-2 py-1">
        <Search className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
        <input
          type="text"
          placeholder="Search unit (e.g. 1906)"
          value={searchDraft}
          onChange={(e) => setSearchDraft(e.target.value)}
          onBlur={commitSearch}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitSearch() } }}
          className="text-xs w-44 focus:outline-none"
          aria-label="Search unit name"
        />
        {searchDraft ? (
          <button
            type="button"
            onClick={() => { setSearchDraft(''); pushUpdate({ q: null }) }}
            aria-label="Clear search"
            className="text-muted-foreground hover:text-mvr-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>

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
