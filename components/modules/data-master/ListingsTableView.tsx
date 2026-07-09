'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, ImageIcon, ChevronLeft, ChevronRight, Building2, LayoutGrid, Check, Sparkles } from 'lucide-react'

export interface DataMasterListingRow {
  id: string
  name: string
  nickname: string | null
  guestyId: string | null
  sqrFeet: number | null
  totalOccupancy: number | null
  unitId: string | null
  unitNumber: string | null
  buildingName: string | null
  suggestedUnitId: string | null
  suggestedUnitLabel: string | null
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

type AttachedFilter = 'all' | 'attached' | 'unattached'

// null = "All buildings" (no building filter applied)
type BuildingFilter = string | null

interface ApiListings {
  data: { rows: DataMasterListingRow[]; total: number; page: number; pageSize: number }
}

export default function ListingsTableView({
  initialRows,
  initialTotal,
  pageSize,
  buildings,
}: {
  initialRows: DataMasterListingRow[]
  initialTotal: number
  pageSize: number
  buildings: BuildingFilterOption[]
}) {
  const router = useRouter()
  const [rows, setRows] = useState<DataMasterListingRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [attached, setAttached] = useState<AttachedFilter>('all')
  const [buildingId, setBuildingId] = useState<BuildingFilter>(null)
  const [loading, setLoading] = useState(false)
  const [attachingId, setAttachingId] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchListings = useCallback(
    async (nextPage: number, search: string, at: AttachedFilter, building: BuildingFilter) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) })
        if (search) params.set('q', search)
        if (at !== 'all') params.set('attached', at)
        if (building) params.set('buildingId', building)
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
    [pageSize]
  )

  const attachUnit = async (listingId: string, unitId: string) => {
    setAttachingId(listingId)
    try {
      const res = await fetch(`/api/v1/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error ?? 'Could not attach the unit')
        return
      }
      toast.success('Listing attached to unit')
      await fetchListings(page, q, attached, buildingId)
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setAttachingId(null)
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchListings(1, q, attached, buildingId), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const handleAttached = (at: AttachedFilter) => {
    setAttached(at)
    fetchListings(1, q, at, buildingId)
  }

  const handleBuilding = (next: BuildingFilter) => {
    setBuildingId(next)
    fetchListings(1, q, attached, next)
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next))
    fetchListings(clamped, q, attached, buildingId)
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
        <div className="flex items-center gap-2">
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
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Type</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Beds / Baths</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-4 py-3 font-medium">Status</th>
              <th className="sticky top-0 z-10 border-b border-[#E0DBD4] bg-white px-6 py-3 font-medium">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-sm text-muted-foreground">
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
                      {row.sqrFeet != null && (
                        <p className="truncate text-xs text-muted-foreground">{row.sqrFeet} sq ft</p>
                      )}
                    </div>
                  </div>
                </td>
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
                <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                  {row.unitId ? (
                    <span className="text-xs text-mvr-success">
                      {row.buildingName ? `${row.buildingName} · ` : ''}
                      {row.unitNumber}
                    </span>
                  ) : row.suggestedUnitId && row.suggestedUnitLabel ? (
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Sparkles className="size-3 text-mvr-primary" />
                        Suggested · <span className="text-mvr-olive">{row.suggestedUnitLabel}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => attachUnit(row.id, row.suggestedUnitId!)}
                          disabled={attachingId === row.id}
                          className="inline-flex items-center gap-1 rounded-full bg-mvr-primary px-2.5 py-0.5 text-xs font-medium text-white transition-colors hover:bg-mvr-primary/90 disabled:opacity-50"
                        >
                          <Check className="size-3" />
                          {attachingId === row.id ? 'Attaching…' : 'Attach'}
                        </button>
                        <button
                          type="button"
                          onClick={() => router.push(`/data-master/listings/${row.id}`)}
                          className="text-[11px] text-muted-foreground underline underline-offset-2 hover:text-mvr-olive"
                        >
                          not it?
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">Unattached</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-6 py-3 text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages}
          {loading && ' · loading…'}
        </span>
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
