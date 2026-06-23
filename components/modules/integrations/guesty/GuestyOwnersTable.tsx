'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  RefreshCw,
  Search,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  Check,
  Link2,
  X,
} from 'lucide-react'

export interface GuestyOwnerRow {
  id: string
  guestyId: string
  fullName: string | null
  email: string | null
  phone: string | null
  ownerType: string | null
  pictureUrl: string | null
  listingCount: number | null
  createdAtGuesty: string | null
  ownerUniqueId: string | null
  suggestedOwnerId: string | null
  suggestedOwnerName: string | null
  owner: { id: string; nickname: string } | null
  syncedAt: string
}

type SortKey = 'owner' | 'guestyId' | 'listings' | 'created'
type SortDir = 'asc' | 'desc'
type MappedFilter = 'all' | 'mapped' | 'unmapped'

interface ApiOwners {
  data: { rows: GuestyOwnerRow[]; total: number; page: number; pageSize: number }
}

interface OwnerSearchResult {
  id: string
  nickname: string
  email: string | null
}

export default function GuestyOwnersTable({
  initialRows,
  initialTotal,
  connected,
  editable,
  pageSize,
}: {
  initialRows: GuestyOwnerRow[]
  initialTotal: number
  connected: boolean
  editable: boolean
  pageSize: number
}) {
  const router = useRouter()
  const [rows, setRows] = useState<GuestyOwnerRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [sortBy, setSortBy] = useState<SortKey>('owner')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [mapped, setMapped] = useState<MappedFilter>('all')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const fetchOwners = useCallback(
    async (nextPage: number, search: string, sb: SortKey, sd: SortDir, mp: MappedFilter) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          pageSize: String(pageSize),
          sortBy: sb,
          sortDir: sd,
        })
        if (search) params.set('q', search)
        if (mp !== 'all') params.set('mapped', mp)
        const res = await fetch(`/api/v1/integrations/guesty/owners?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to load owners')
        const json = (await res.json()) as ApiOwners
        setRows(json.data.rows)
        setTotal(json.data.total)
        setPage(json.data.page)
      } catch {
        toast.error('Could not load owners')
      } finally {
        setLoading(false)
      }
    },
    [pageSize]
  )

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchOwners(1, q, sortBy, sortDir, mapped)
    }, 350)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  const handleSort = (key: SortKey) => {
    const nextDir: SortDir = key === sortBy ? (sortDir === 'asc' ? 'desc' : 'asc') : key === 'created' ? 'desc' : 'asc'
    setSortBy(key)
    setSortDir(nextDir)
    fetchOwners(1, q, key, nextDir, mapped)
  }

  const handleMapped = (mp: MappedFilter) => {
    setMapped(mp)
    fetchOwners(1, q, sortBy, sortDir, mp)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/integrations/guesty/owners/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Owner sync failed')
        return
      }
      toast.success(`Pulled ${json.data?.synced ?? 0} owners from Guesty`)
      await fetchOwners(1, q, sortBy, sortDir, mapped)
      router.refresh()
    } catch {
      toast.error('Network error during owner sync')
    } finally {
      setRefreshing(false)
    }
  }

  // Confirm/link/unlink the Data Master Owner mapping.
  const mapOwner = async (row: GuestyOwnerRow, ownerUniqueId: string | null, label: string | null) => {
    try {
      const res = await fetch(`/api/v1/integrations/guesty/owners/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerUniqueId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not update mapping')
        return
      }
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, ownerUniqueId, owner: ownerUniqueId ? { id: ownerUniqueId, nickname: label ?? '' } : null }
            : r
        )
      )
      toast.success(ownerUniqueId ? 'Owner mapped' : 'Mapping removed')
    } catch {
      toast.error('Network error while mapping owner')
    }
  }

  const goToPage = (next: number) => {
    const clamped = Math.min(totalPages, Math.max(1, next))
    fetchOwners(clamped, q, sortBy, sortDir, mapped)
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
        <p className="text-xs text-muted-foreground">{total} owners pulled from Guesty</p>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
            {(['all', 'mapped', 'unmapped'] as MappedFilter[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMapped(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  mapped === m ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
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
              placeholder="Search owners…"
              className="w-48 rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
            />
          </div>
          {editable && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || !connected}
              title={connected ? 'Pull all owners from Guesty' : 'Connect Guesty first'}
              className="inline-flex items-center gap-2 rounded-full bg-mvr-primary px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-mvr-primary/90 focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh owners'}
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <SortHeader label="Owner" sortKey="owner" className="px-6" />
              <SortHeader label="Guesty ID" sortKey="guestyId" className="px-4" />
              <SortHeader label="Listings" sortKey="listings" className="px-4" />
              <th className="px-6 py-3 font-medium">Data Master Owner</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">
                  {connected
                    ? 'No owners yet. Click “Refresh owners” to pull them from Guesty.'
                    : 'Connect Guesty above, then refresh to pull your owners.'}
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-[#E0DBD4]/60 transition-colors hover:bg-mvr-neutral/40">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mvr-neutral">
                      {row.pictureUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.pictureUrl} alt="" className="size-full object-cover" />
                      ) : (
                        <UserCircle2 className="size-5 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-mvr-olive">{row.fullName || 'Unnamed owner'}</p>
                      {row.email && <p className="truncate text-xs text-muted-foreground">{row.email}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.guestyId}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.listingCount ?? '—'}</td>
                <td className="px-6 py-3">
                  <OwnerMappingCell row={row} editable={editable} onMap={mapOwner} />
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

/** Mapping status + actions for a single Guesty owner row. */
function OwnerMappingCell({
  row,
  editable,
  onMap,
}: {
  row: GuestyOwnerRow
  editable: boolean
  onMap: (row: GuestyOwnerRow, ownerUniqueId: string | null, label: string | null) => void
}) {
  const [linking, setLinking] = useState(false)

  if (row.ownerUniqueId) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-mvr-success-light px-2.5 py-0.5 text-xs font-medium text-mvr-success">
          <Check className="size-3" />
          {row.owner?.nickname || 'Mapped'}
        </span>
        {editable && (
          <button
            type="button"
            onClick={() => onMap(row, null, null)}
            title="Remove mapping"
            className="text-muted-foreground/60 transition-colors hover:text-mvr-danger"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  if (linking) {
    return <OwnerLinkPicker row={row} onPick={(id, label) => onMap(row, id, label)} onClose={() => setLinking(false)} />
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {row.suggestedOwnerName ? (
        <>
          <span className="text-xs text-muted-foreground">
            Suggested: <span className="text-mvr-olive">{row.suggestedOwnerName}</span>
          </span>
          {editable && (
            <button
              type="button"
              onClick={() => onMap(row, row.suggestedOwnerId, row.suggestedOwnerName)}
              className="inline-flex items-center gap-1 rounded-full bg-mvr-primary px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-mvr-primary/90"
            >
              <Check className="size-3" />
              Confirm
            </button>
          )}
        </>
      ) : (
        <span className="text-xs text-muted-foreground/60">Unmapped</span>
      )}
      {editable && (
        <button
          type="button"
          onClick={() => setLinking(true)}
          className="inline-flex items-center gap-1 rounded-full border border-[#E0DBD4] px-2.5 py-1 text-xs font-medium text-mvr-olive transition-colors hover:bg-mvr-neutral/50"
        >
          <Link2 className="size-3" />
          Link…
        </button>
      )}
    </div>
  )
}

/** Inline searchable picker that links a Guesty owner to a Data Master Owner. */
function OwnerLinkPicker({
  row,
  onPick,
  onClose,
}: {
  row: GuestyOwnerRow
  onPick: (ownerUniqueId: string, label: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState(row.fullName ?? '')
  const [results, setResults] = useState<OwnerSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('search', q.trim())
        const res = await fetch(`/api/v1/owners?${params.toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: OwnerSearchResult[] }
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

  return (
    <div className="w-72 rounded-lg border border-[#E0DBD4] bg-white p-2 shadow-panel">
      <div className="mb-2 flex items-center gap-2">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Data Master owners…"
          className="w-full rounded-md border border-[#E0DBD4] bg-white px-2 py-1.5 text-xs text-mvr-olive outline-none focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
        />
        <button type="button" onClick={onClose} className="text-muted-foreground/60 hover:text-mvr-olive">
          <X className="size-4" />
        </button>
      </div>
      <ul className="max-h-48 overflow-y-auto">
        {loading && <li className="px-2 py-1.5 text-xs text-muted-foreground">Searching…</li>}
        {!loading && results.length === 0 && (
          <li className="px-2 py-1.5 text-xs text-muted-foreground">No owners found</li>
        )}
        {results.map((o) => (
          <li key={o.id}>
            <button
              type="button"
              onClick={() => onPick(o.id, o.nickname)}
              className="flex w-full flex-col rounded-md px-2 py-1.5 text-left transition-colors hover:bg-mvr-neutral/50"
            >
              <span className="text-xs font-medium text-mvr-olive">{o.nickname}</span>
              {o.email && <span className="text-[11px] text-muted-foreground">{o.email}</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
