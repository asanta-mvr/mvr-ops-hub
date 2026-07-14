'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, X, Link2, Check, Building2, ChevronRight } from 'lucide-react'

// A unit already attached to this listing (from the listing detail page).
export interface AttachedUnit {
  id: string
  number: string
  buildingName: string | null
}

interface Props {
  listingId: string
  editable: boolean
  attached: AttachedUnit[]
}

/**
 * Listing-side mirror of UnitListingsCockpit: attach/detach units to a listing,
 * with an inline unit search. Writes go to the same unit-scoped join endpoints,
 * so the relationship stays in sync with each unit's Listings tab.
 */
export default function ListingUnitsCockpit({ listingId, editable, attached }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const attachedIds = new Set(attached.map((u) => u.id))

  async function attach(unitId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/units/${unitId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not attach the unit')
        return
      }
      toast.success('Unit attached')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function detach(unitId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/units/${unitId}/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error ?? 'Could not detach the unit')
        return
      }
      toast.success('Unit detached')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
      <h3 className="font-display text-lg text-mvr-primary">Units ({attached.length})</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        A listing can span more than one unit (combined listing). Search and attach the units that
        belong to this listing — changes sync with each unit&rsquo;s Listings tab.
      </p>

      {editable && <UnitPicker disabled={busy} attachedIds={attachedIds} onPick={attach} />}

      {attached.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No unit attached yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {attached.map((u) => (
            <li
              key={u.id}
              className="group flex items-center justify-between gap-3 rounded-lg border border-[#E0DBD4] bg-mvr-neutral/40 px-3 py-2"
            >
              <Link
                href={`/data-master/units/${u.id}`}
                className="flex min-w-0 items-center gap-2 text-sm text-mvr-olive transition-colors hover:text-mvr-primary"
              >
                <Building2 className="size-4 shrink-0 text-mvr-steel" />
                <span className="truncate font-medium">
                  {u.buildingName ? `${u.buildingName} · ` : ''}Unit {u.number}
                </span>
                <ChevronRight className="size-4 shrink-0 text-mvr-primary/40" />
              </Link>
              {editable && (
                <button
                  type="button"
                  onClick={() => detach(u.id)}
                  disabled={busy}
                  title="Detach unit"
                  className="shrink-0 rounded p-1 text-muted-foreground/50 transition-colors hover:bg-mvr-danger-light hover:text-mvr-danger disabled:opacity-40"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Inline unit search picker (attach existing) ────────────────────────────────

interface UnitResult {
  id: string
  number: string
  building: { id: string; name: string } | null
  _count?: { unitListings: number }
}

function UnitPicker({
  onPick,
  attachedIds,
  disabled,
}: {
  onPick: (unitId: string) => void
  attachedIds: Set<string>
  disabled: boolean
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UnitResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      if (!q.trim()) {
        setResults([])
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams({ search: q.trim() })
        const res = await fetch(`/api/v1/units?${params.toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: UnitResult[] }
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
    <div className="mt-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search units by number…"
          className="w-full rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
        />
      </div>
      {q.trim() && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[#E0DBD4]">
          {loading && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No units found</li>
          )}
          {results.map((r) => {
            const already = attachedIds.has(r.id)
            return (
              <li key={r.id} className="border-t border-[#E0DBD4]/60 first:border-t-0">
                <button
                  type="button"
                  disabled={disabled || already}
                  onClick={() => onPick(r.id)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:cursor-default disabled:opacity-60"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate">
                      {r.building ? `${r.building.name} · ` : ''}Unit {r.number}
                    </span>
                    {typeof r._count?.unitListings === 'number' && r._count.unitListings > 0 && !already && (
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">
                        {r._count.unitListings} listing{r._count.unitListings === 1 ? '' : 's'}
                      </span>
                    )}
                  </span>
                  {already ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-mvr-success">
                      <Check className="size-3" /> Attached
                    </span>
                  ) : (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs text-mvr-primary">
                      <Link2 className="size-3" /> Attach
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
