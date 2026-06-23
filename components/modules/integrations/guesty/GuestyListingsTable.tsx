'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  RefreshCw,
  Search,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Upload,
} from 'lucide-react'

export interface GuestyListingRow {
  id: string
  guestyId: string
  title: string | null
  nickname: string | null
  propertyType: string | null
  addressFull: string | null
  accommodates: number | null
  bedrooms: number | null
  bathrooms: number | null
  active: boolean | null
  pictureUrl: string | null
  createdAtGuesty: string | null
  unitId: string | null
  syncedAt: string
}

type SortKey = 'listing' | 'guestyId' | 'active' | 'created'
type SortDir = 'asc' | 'desc'
type StatusFilter = 'all' | 'active' | 'inactive'
type MappedFilter = 'all' | 'mapped' | 'unmapped'

interface ApiListings {
  data: { rows: GuestyListingRow[]; total: number; page: number; pageSize: number }
}

export default function GuestyListingsTable({
  initialRows,
  initialTotal,
  connected,
  editable,
  pageSize,
}: {
  initialRows: GuestyListingRow[]
  initialTotal: number
  connected: boolean
  lastSyncAt: string | null
  editable: boolean
  pageSize: number
}) {
  const router = useRouter()
  const [rows, setRows] = useState<GuestyListingRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [mapped, setMapped] = useState<MappedFilter>('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  // When true, the selection means "every listing matching the current filters"
  // (across all pages) — push then sends the filters instead of explicit ids.
  const [selectAllMatching, setSelectAllMatching] = useState(false)
  const [pushing, setPushing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const selectionCount = selectAllMatching ? total : selected.size

  const clearSelection = () => {
    setSelected(new Set())
    setSelectAllMatching(false)
  }

  const toggleOne = (id: string) => {
    const wasAll = selectAllMatching
    setSelectAllMatching(false)
    setSelected((prev) => {
      // Exiting "all matching" falls back to the current page's rows.
      const next = new Set(wasAll ? rows.map((r) => r.id) : prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllOnPage = () => {
    if (selectAllMatching) {
      clearSelection()
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (rows.every((r) => next.has(r.id))) rows.forEach((r) => next.delete(r.id))
      else rows.forEach((r) => next.add(r.id))
      return next
    })
  }

  const fetchListings = useCallback(
    async (nextPage: number, search: string, sb: SortKey, sd: SortDir, st: StatusFilter, mp: MappedFilter) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(pageSize),
          sortBy: sb,
          sortDir: sd,
        })
        if (search) params.set('q', search)
        if (st !== 'all') params.set('status', st)
        if (mp !== 'all') params.set('mapped', mp)
        const res = await fetch(`/api/v1/integrations/guesty/listings?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load listings')
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

  // Debounced search. Changing the query changes the match set → reset selection.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      clearSelection()
      fetchListings(1, q, sortBy, sortDir, status, mapped)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const handleSort = (key: SortKey) => {
    // Toggle direction when clicking the active column; otherwise start asc
    // (created defaults to desc — newest first feels right for a date).
    const nextDir: SortDir = key === sortBy ? (sortDir === 'asc' ? 'desc' : 'asc') : key === 'created' ? 'desc' : 'asc'
    setSortBy(key)
    setSortDir(nextDir)
    fetchListings(1, q, key, nextDir, status, mapped)
  }

  const handleStatus = (st: StatusFilter) => {
    setStatus(st)
    clearSelection()
    fetchListings(1, q, sortBy, sortDir, st, mapped)
  }

  const handleMapped = (mp: MappedFilter) => {
    setMapped(mp)
    clearSelection()
    fetchListings(1, q, sortBy, sortDir, status, mp)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/integrations/guesty/connection/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Sync failed')
        return
      }
      toast.success(`Pulled ${json.data?.synced ?? 0} listings from Guesty`)
      await fetchListings(1, q, sortBy, sortDir, status, mapped)
      router.refresh()
    } catch {
      toast.error('Network error during sync')
    } finally {
      setRefreshing(false)
    }
  }

  const handlePush = async () => {
    if (!selectAllMatching && selected.size === 0) return
    setPushing(true)
    try {
      // "All matching" → push by the current filters (server resolves every
      // matching listing). Otherwise push the explicitly checked ids.
      const payload = selectAllMatching
        ? {
            filter: {
              ...(q.trim() ? { q: q.trim() } : {}),
              ...(status !== 'all' ? { status } : {}),
              ...(mapped !== 'all' ? { mapped } : {}),
            },
          }
        : { guestyListingIds: Array.from(selected) }

      const res = await fetch('/api/v1/integrations/guesty/listings/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Push failed')
        return
      }
      toast.success(`Pushed ${json.data?.pushed ?? 0} listings to Data Master`)
      clearSelection()
      router.refresh()
    } catch {
      toast.error('Network error during push')
    } finally {
      setPushing(false)
    }
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next))
    fetchListings(clamped, q, sortBy, sortDir, status, mapped)
  }

  const SortHeader = ({ label, sortKey, className = '' }: { label: string; sortKey: SortKey; className?: string }) => {
    const active = sortBy === sortKey
    const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ChevronsUpDown
    return (
      <th className={`py-3 font-medium ${className}`}>
        <button
          type="button"
          onClick={() => handleSort(sortKey)}
          className={`group inline-flex items-center gap-1 transition-colors hover:text-mvr-primary ${
            active ? 'text-mvr-primary' : ''
          }`}
        >
          {label}
          <Icon className={`size-3 ${active ? '' : 'opacity-40 group-hover:opacity-70'}`} />
        </button>
      </th>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-3 border-b border-[#E0DBD4] px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {total} pulled from Guesty · active &amp; inactive
        </p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'active', 'inactive'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleStatus(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  status === s
                    ? 'bg-white text-mvr-primary shadow-sm'
                    : 'text-muted-foreground hover:text-mvr-olive'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'mapped', 'unmapped'] as MappedFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMapped(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  mapped === m
                    ? 'bg-white text-mvr-primary shadow-sm'
                    : 'text-muted-foreground hover:text-mvr-olive'
                }`}
              >
                {m}
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
          {editable && selectionCount > 0 && (
            <button
              type="button"
              onClick={handlePush}
              disabled={pushing}
              title="Push selected listings into Data Master"
              className="inline-flex items-center gap-2 rounded-full border border-mvr-primary bg-white px-4 py-2 text-sm font-medium text-mvr-primary shadow-sm transition-all hover:bg-mvr-primary-light focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className={`size-4 ${pushing ? 'animate-pulse' : ''}`} />
              {pushing ? 'Pushing…' : `Push ${selectionCount} to Data Master`}
            </button>
          )}
          {editable && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || !connected}
              title={connected ? 'Pull all listings from Guesty' : 'Connect Guesty first'}
              className="inline-flex items-center gap-2 rounded-full bg-mvr-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-mvr-primary/90 focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh listings'}
            </button>
          )}
        </div>
      </div>

      {/* Select-all-matching banner: lets the user push beyond the current page. */}
      {editable && (selectAllMatching || (allOnPageSelected && total > rows.length)) && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-b border-[#E0DBD4] bg-mvr-primary-light/60 px-6 py-2 text-xs text-mvr-primary">
          {selectAllMatching ? (
            <>
              <span>All {total} listings matching the current filters are selected.</span>
              <button type="button" onClick={clearSelection} className="font-medium underline underline-offset-2">
                Clear selection
              </button>
            </>
          ) : (
            <>
              <span>All {rows.length} on this page are selected.</span>
              <button
                type="button"
                onClick={() => setSelectAllMatching(true)}
                className="font-medium underline underline-offset-2"
              >
                Select all {total} that match the filters
              </button>
            </>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
              {editable && (
                <th className="w-10 pl-6 pr-2 py-3">
                  <input
                    type="checkbox"
                    checked={selectAllMatching || allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on page"
                    className="size-4 cursor-pointer accent-mvr-primary"
                  />
                </th>
              )}
              <SortHeader label="Listing" sortKey="listing" className={editable ? 'px-2' : 'px-6'} />
              <SortHeader label="Guesty ID" sortKey="guestyId" className="px-4" />
              <SortHeader label="Status" sortKey="active" className="px-4" />
              <SortHeader label="Created" sortKey="created" className="px-4" />
              <th className="px-6 py-3 font-medium">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={editable ? 6 : 5} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {connected
                    ? 'No listings yet. Click “Refresh listings” to pull them from Guesty.'
                    : 'Connect Guesty above, then refresh to pull your listings.'}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#E0DBD4]/60 transition-colors hover:bg-mvr-neutral/40">
                {editable && (
                  <td className="w-10 pl-6 pr-2 py-3">
                    <input
                      type="checkbox"
                      checked={selectAllMatching || selected.has(row.id)}
                      onChange={() => toggleOne(row.id)}
                      aria-label="Select listing"
                      className="size-4 cursor-pointer accent-mvr-primary"
                    />
                  </td>
                )}
                <td className={editable ? 'px-2 py-3' : 'px-6 py-3'}>
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
                      <p className="truncate font-medium text-mvr-olive">
                        {row.nickname || row.title || 'Untitled listing'}
                      </p>
                      {row.title && row.title !== (row.nickname || row.title) && (
                        <p className="truncate text-xs text-muted-foreground">{row.title}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.guestyId}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      row.active
                        ? 'bg-mvr-success-light text-mvr-success'
                        : 'bg-mvr-danger-light text-mvr-danger'
                    }`}
                  >
                    {row.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.createdAtGuesty
                    ? new Date(row.createdAtGuesty).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : '—'}
                </td>
                <td className="px-6 py-3">
                  {row.unitId ? (
                    <span className="text-xs text-mvr-success">Mapped</span>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">Unmapped</span>
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
