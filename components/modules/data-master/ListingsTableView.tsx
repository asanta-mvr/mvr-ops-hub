'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react'

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
  pictureUrl: string | null
  active: boolean | null
  propertyType: string | null
  bedrooms: number | null
  bathrooms: number | null
  accommodates: number | null
}

type AttachedFilter = 'all' | 'attached' | 'unattached'

interface ApiListings {
  data: { rows: DataMasterListingRow[]; total: number; page: number; pageSize: number }
}

export default function ListingsTableView({
  initialRows,
  initialTotal,
  pageSize,
}: {
  initialRows: DataMasterListingRow[]
  initialTotal: number
  pageSize: number
}) {
  const router = useRouter()
  const [rows, setRows] = useState<DataMasterListingRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [attached, setAttached] = useState<AttachedFilter>('all')
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchListings = useCallback(
    async (nextPage: number, search: string, at: AttachedFilter) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) })
        if (search) params.set('q', search)
        if (at !== 'all') params.set('attached', at)
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchListings(1, q, attached), 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const handleAttached = (at: AttachedFilter) => {
    setAttached(at)
    fetchListings(1, q, at)
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next))
    fetchListings(clamped, q, attached)
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white shadow-card">
      <div className="flex flex-col gap-3 border-b border-[#E0DBD4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{total} listings in Data Master</p>
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-6 py-3 font-medium">Listing</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Beds / Baths</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Unit</th>
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
                <td className="px-6 py-3">
                  {row.unitId ? (
                    <span className="text-xs text-mvr-success">
                      {row.buildingName ? `${row.buildingName} · ` : ''}
                      {row.unitNumber}
                    </span>
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
  )
}
