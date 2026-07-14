'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, ImageIcon, ChevronLeft, ChevronRight, Building2, LayoutGrid, Check, Link2, X } from 'lucide-react'

export interface DataMasterListingRow {
  id: string
  name: string
  nickname: string | null
  guestyId: string | null
  sqrFeet: number | null
  totalOccupancy: number | null
  // First attached unit (for the single-line label) + the full set for the "+N".
  unitId: string | null
  unitNumber: string | null
  buildingName: string | null
  units: { id: string; number: string; buildingName: string | null }[]
  unitCount: number
  // Auto-match candidate (name/nickname → unit); null when there's no unique match.
  suggestedUnitId: string | null
  suggestedUnitLabel: string | null
  // "Unit Types" custom field (Combined / Individual), surfaced as "Listing Type".
  listingType: string | null
  pictureUrl: string | null
  active: boolean | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  accommodates: number | null
}

export interface BuildingFilterOption {
  id: string
  name: string
  listingCount: number
}

// Minimal unit shape passed around by the mapping cell / picker.
type UnitRef = { id: string; number: string; buildingName: string | null }

type AttachedFilter = 'all' | 'attached' | 'unattached'

// "all" = no listing-type filter; otherwise the exact unit_types custom-field value.
type ListingTypeFilter = 'all' | 'Individual' | 'Combined'

// Listing status (from the source GuestyListing.active).
type StatusFilter = 'all' | 'active' | 'inactive'

// Selectable page sizes for the bottom "Show" control.
const PAGE_SIZE_OPTIONS = [50, 100, 150, 200] as const

// null = "All buildings" (no building filter applied)
type BuildingFilter = string | null

interface ApiListings {
  data: { rows: DataMasterListingRow[]; total: number; page: number; pageSize: number }
}

export default function ListingsTableView({
  initialRows,
  initialTotal,
  pageSize: initialPageSize,
  buildings,
  editable,
}: {
  initialRows: DataMasterListingRow[]
  initialTotal: number
  pageSize: number
  buildings: BuildingFilterOption[]
  editable: boolean
}) {
  const router = useRouter()
  const [rows, setRows] = useState<DataMasterListingRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [attached, setAttached] = useState<AttachedFilter>('all')
  const [listingType, setListingType] = useState<ListingTypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [buildingId, setBuildingId] = useState<BuildingFilter>(null)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchListings = useCallback(
    async (
      nextPage: number,
      search: string,
      at: AttachedFilter,
      building: BuildingFilter,
      lt: ListingTypeFilter,
      st: StatusFilter,
      size: number
    ) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), pageSize: String(size) })
        if (search) params.set('q', search)
        if (at !== 'all') params.set('attached', at)
        if (building) params.set('building', building)
        if (lt !== 'all') params.set('listingType', lt)
        if (st !== 'all') params.set('status', st)
        const res = await fetch(`/api/v1/listings?${params.toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as ApiListings
        setRows(json.data.rows)
        setTotal(json.data.total)
        setPage(json.data.page)
      } catch {
        toast.error('Could not load listings')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchListings(1, q, attached, buildingId, listingType, status, pageSize), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const handleAttached = (at: AttachedFilter) => {
    setAttached(at)
    fetchListings(1, q, at, buildingId, listingType, status, pageSize)
  }

  const handleListingType = (lt: ListingTypeFilter) => {
    setListingType(lt)
    fetchListings(1, q, attached, buildingId, lt, status, pageSize)
  }

  const handleStatus = (st: StatusFilter) => {
    setStatus(st)
    fetchListings(1, q, attached, buildingId, listingType, st, pageSize)
  }

  const handleBuilding = (next: BuildingFilter) => {
    setBuildingId(next)
    fetchListings(1, q, attached, next, listingType, status, pageSize)
  }

  const handlePageSize = (size: number) => {
    setPageSize(size)
    fetchListings(1, q, attached, buildingId, listingType, status, size)
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next))
    fetchListings(clamped, q, attached, buildingId, listingType, status, pageSize)
  }

  // Attach a unit to the listing. The join is idempotent and lives on the unit
  // side, so we POST to /units/:unitId/listings and optimistically patch the row.
  const attachUnit = async (row: DataMasterListingRow, unit: UnitRef) => {
    try {
      const res = await fetch(`/api/v1/units/${unit.id}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: row.id }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not attach unit')
        return
      }
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== row.id || r.units.some((u) => u.id === unit.id)) return r
          const units = [...r.units, unit]
          return { ...r, units, ...deriveUnitFields(units) }
        })
      )
      toast.success('Unit attached')
    } catch {
      toast.error('Network error while attaching unit')
    }
  }

  // Detach a unit from the listing (remove the join row).
  const detachUnit = async (row: DataMasterListingRow, unitId: string) => {
    try {
      const res = await fetch(`/api/v1/units/${unitId}/listings/${row.id}`, { method: 'DELETE' })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not remove unit')
        return
      }
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== row.id) return r
          const units = r.units.filter((u) => u.id !== unitId)
          return { ...r, units, ...deriveUnitFields(units) }
        })
      )
      toast.success('Unit removed')
    } catch {
      toast.error('Network error while removing unit')
    }
  }

  const activeBuilding = buildingId ? buildings.find((b) => b.id === buildingId) ?? null : null

  return (
    <div className="grid gap-4 md:grid-cols-[240px_1fr]">
      {/* Left building filter card — mirrors the dispute-tool Agent sub-nav */}
      <nav className="rounded-xl border border-[#E0DBD4] bg-white p-2 shadow-card md:sticky md:top-6 md:self-start">
        <p className="px-2 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Buildings
        </p>
        <div className="flex gap-1 overflow-x-auto md:max-h-[calc(100vh-10rem)] md:flex-col md:overflow-y-auto">
          <button
            type="button"
            onClick={() => handleBuilding(null)}
            className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors md:shrink ${
              buildingId === null
                ? 'bg-mvr-primary-light font-medium text-mvr-primary'
                : 'text-mvr-olive hover:bg-mvr-neutral'
            }`}
          >
            <span className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 shrink-0" />
              All buildings
            </span>
          </button>
          {buildings.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => handleBuilding(b.id)}
              className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors md:shrink ${
                buildingId === b.id
                  ? 'bg-mvr-primary-light font-medium text-mvr-primary'
                  : 'text-mvr-olive hover:bg-mvr-neutral'
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <Building2 className="h-4 w-4 shrink-0 text-mvr-steel" />
                <span className="truncate">{b.name}</span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                  buildingId === b.id ? 'bg-white text-mvr-primary' : 'bg-mvr-neutral text-muted-foreground'
                }`}
              >
                {b.listingCount}
              </span>
            </button>
          ))}
          {buildings.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">No active buildings.</p>
          ) : null}
        </div>
      </nav>

      {/* Right pane — listings table */}
      <div className="min-w-0 rounded-xl border border-[#E0DBD4] bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-[#E0DBD4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {total} listing{total === 1 ? '' : 's'}
          {activeBuilding ? ` in ${activeBuilding.name}` : ' in Data Master'}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'attached', 'unattached'] as AttachedFilter[]).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => handleAttached(a)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  attached === a ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          {/* Listing type (unit_types custom field): All / Individual / Combined */}
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'Individual', 'Combined'] as ListingTypeFilter[]).map((lt) => (
              <button
                key={lt}
                type="button"
                onClick={() => handleListingType(lt)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  listingType === lt ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
                }`}
              >
                {lt === 'all' ? 'All' : lt}
              </button>
            ))}
          </div>
          {/* Status (from the source GuestyListing.active): All / Active / Inactive */}
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => handleStatus(st)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  status === st ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search listings…"
              className="w-48 rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
            />
          </div>
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-16rem)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-6 py-3 font-medium">Listing</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Listing Type</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Type</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Beds / Baths</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Status</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-6 py-3 font-medium">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No listings yet. Push listings from the Guesty integration to populate Data Master.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => router.push(`/data-master/listings/${row.id}`)}
                className="cursor-pointer border-b border-[#E0DBD4]/60 transition-colors hover:bg-mvr-neutral/40"
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-mvr-neutral">
                      {row.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.pictureUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <ImageIcon className="size-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-mvr-olive">{row.nickname || row.name}</p>
                      {row.guestyId && (
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{row.guestyId}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.listingType ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.propertyType ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.bedrooms ?? '—'} / {row.bathrooms ?? '—'}
                </td>
                <td className="px-4 py-3">
                  {row.active == null ? (
                    <span className="text-xs text-muted-foreground/60">—</span>
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.active ? 'bg-mvr-success-light text-mvr-success' : 'bg-mvr-danger-light text-mvr-danger'
                      }`}
                    >
                      {row.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                {/* Interactive mapping cell — stop clicks from opening the row. */}
                <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                  <UnitMappingCell row={row} editable={editable} onAttach={attachUnit} onDetach={detachUnit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <span>
            Page {page} of {totalPages}
            {loading && ' · loading…'}
          </span>
          <label className="flex items-center gap-1.5 text-xs">
            Show
            <select
              value={pageSize}
              onChange={(e) => handlePageSize(Number(e.target.value))}
              className="rounded-lg border border-[#E0DBD4] bg-white px-2 py-1 text-xs text-mvr-olive outline-none focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            per page
          </label>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E0DBD4] px-2.5 py-1.5 transition-colors hover:bg-mvr-neutral/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="size-4" />
            Prev
          </button>
          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-lg border border-[#E0DBD4] px-2.5 py-1.5 transition-colors hover:bg-mvr-neutral/50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}

// Derive the single-unit display fields from the full attached set.
function deriveUnitFields(units: UnitRef[]) {
  const first = units[0] ?? null
  return {
    unitId: first?.id ?? null,
    unitNumber: first?.number ?? null,
    buildingName: first?.buildingName ?? null,
    unitCount: units.length,
  }
}

/**
 * Unit mapping for a single listing row. Mirrors the Guesty owner-mapping cell:
 * attached units render as removable pills; when nothing is attached we surface
 * the auto-match suggestion with a Confirm button; a Link…/Add… button opens an
 * inline searchable picker. A listing may span several units (combined listing),
 * so the picker stays available even after the first attach.
 */
function UnitMappingCell({
  row,
  editable,
  onAttach,
  onDetach,
}: {
  row: DataMasterListingRow
  editable: boolean
  onAttach: (row: DataMasterListingRow, unit: UnitRef) => void
  onDetach: (row: DataMasterListingRow, unitId: string) => void
}) {
  const [linking, setLinking] = useState(false)
  const attachedIds = new Set(row.units.map((u) => u.id))
  const hasUnits = row.units.length > 0

  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.units.map((u) => (
        <span
          key={u.id}
          className="inline-flex items-center gap-1 rounded-full bg-mvr-success-light px-2.5 py-0.5 text-xs font-medium text-mvr-success"
        >
          <Check className="size-3" />
          {u.buildingName ? `${u.buildingName} · ${u.number}` : u.number}
          {editable && (
            <button
              type="button"
              onClick={() => onDetach(row, u.id)}
              title="Remove unit"
              className="ml-0.5 text-mvr-success/60 transition-colors hover:text-mvr-danger"
            >
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}

      {!hasUnits && !linking && row.suggestedUnitId && row.suggestedUnitLabel ? (
        <>
          <span className="text-xs text-muted-foreground">
            Suggested: <span className="text-mvr-olive">{row.suggestedUnitLabel}</span>
          </span>
          {editable && (
            <button
              type="button"
              onClick={() =>
                onAttach(row, { id: row.suggestedUnitId!, number: row.suggestedUnitLabel!, buildingName: null })
              }
              className="inline-flex items-center gap-1 rounded-full bg-mvr-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-mvr-primary/90"
            >
              <Check className="size-3" />
              Confirm
            </button>
          )}
        </>
      ) : null}

      {!hasUnits && !linking && !row.suggestedUnitId ? (
        <span className="text-xs text-muted-foreground/60">Unattached</span>
      ) : null}

      {linking ? (
        <UnitLinkPicker
          attachedIds={attachedIds}
          onPick={(unit) => {
            onAttach(row, unit)
            setLinking(false)
          }}
          onClose={() => setLinking(false)}
        />
      ) : (
        editable && (
          <button
            type="button"
            onClick={() => setLinking(true)}
            className="inline-flex items-center gap-1 rounded-full border border-[#E0DBD4] px-2.5 py-1 text-xs font-medium text-mvr-olive transition-colors hover:bg-mvr-neutral/50"
          >
            <Link2 className="size-3" />
            {hasUnits ? 'Add…' : 'Link…'}
          </button>
        )
      )}
    </div>
  )
}

interface UnitSearchResult {
  id: string
  number: string
  building: { id: string; name: string } | null
}

/** Inline searchable picker that attaches a unit to the listing. */
function UnitLinkPicker({
  attachedIds,
  onPick,
  onClose,
}: {
  attachedIds: Set<string>
  onPick: (unit: UnitRef) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UnitSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const term = q.trim()
    if (!term) {
      setResults([])
      setLoading(false)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/v1/units?${new URLSearchParams({ search: term }).toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: UnitSearchResult[] }
        setResults(json.data.slice(0, 8))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  const term = q.trim()

  return (
    <div className="w-72 rounded-lg border border-[#E0DBD4] bg-white p-2 shadow-panel">
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search units by number…"
          className="w-full rounded-md border border-[#E0DBD4] bg-white px-2 py-1.5 text-xs text-mvr-olive outline-none focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
        />
        <button type="button" onClick={onClose} className="text-muted-foreground/60 hover:text-mvr-olive">
          <X className="size-4" />
        </button>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {!term && <li className="px-2 py-1.5 text-xs text-muted-foreground">Type a unit number to search…</li>}
        {term && loading && <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>}
        {term && !loading && results.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">No units found</li>
        )}
        {results.map((u) => {
          const already = attachedIds.has(u.id)
          return (
            <li key={u.id}>
              <button
                type="button"
                disabled={already}
                onClick={() => onPick({ id: u.id, number: u.number, buildingName: u.building?.name ?? null })}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-mvr-neutral/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-mvr-olive">{u.number}</span>
                  {u.building && <span className="truncate text-[11px] text-muted-foreground">{u.building.name}</span>}
                </span>
                {already && <span className="shrink-0 text-[11px] text-mvr-success">Attached</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
