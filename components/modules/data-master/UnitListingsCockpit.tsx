'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Search, X, Link2, Check } from 'lucide-react'

// Slim shape of a listing already attached to this unit (from the unit page).
export interface AttachedListing {
  id: string
  name: string
  nickname: string | null
  guestyId: string | null
  // "Unit Types" custom field: "Combined" | "Individual" (null when unset).
  listingType: string | null
}

interface Props {
  unitId: string
  editable: boolean
  attached: AttachedListing[]
}

export default function UnitListingsCockpit({ unitId, editable, attached }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const attachedIds = new Set(attached.map((l) => l.id))

  async function attach(listingId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/units/${unitId}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not attach the listing')
        return
      }
      toast.success('Listing attached')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function detach(listingId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/units/${unitId}/listings/${listingId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => null)
        toast.error(json?.error ?? 'Could not detach the listing')
        return
      }
      toast.success('Listing detached')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border px-5 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
          Listings ({attached.length})
        </h2>
      </div>

      <p className="text-xs text-muted-foreground">
        A listing can be attached to more than one unit (combined listings). Search and attach as
        many listings as belong to this unit.
      </p>

      {/* Attach picker */}
      {editable && (
        <ListingPicker disabled={busy} attachedIds={attachedIds} onPick={attach} />
      )}

      {/* Attached listings */}
      {attached.length === 0 ? (
        <p className="text-sm text-muted-foreground">No listings attached yet.</p>
      ) : (
        <ul className="space-y-2">
          {attached.map((l) => (
            <li
              key={l.id}
              className="group flex items-center justify-between gap-3 rounded-lg border border-[#E0DBD4] bg-mvr-neutral/40 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-mvr-olive">
                    {l.nickname || l.name}
                  </span>
                  {l.listingType && <ListingTypeTag value={l.listingType} />}
                </div>
                {l.guestyId && (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{l.guestyId}</p>
                )}
              </div>
              {editable && (
                <button
                  type="button"
                  onClick={() => detach(l.id)}
                  disabled={busy}
                  title="Detach listing"
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

// Combined / Individual tag derived from the listing's "Unit Types" custom field.
function ListingTypeTag({ value }: { value: string }) {
  const isCombined = value.trim().toLowerCase() === 'combined'
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
        isCombined ? 'bg-mvr-primary-light text-mvr-primary' : 'bg-mvr-sand-light text-mvr-olive'
      }`}
    >
      {value}
    </span>
  )
}

// ── Inline listing search picker (attach existing) ─────────────────────────────

interface ListingResult {
  id: string
  name: string
  nickname: string | null
  guestyId: string | null
  unitCount: number
}

function ListingPicker({
  onPick,
  attachedIds,
  disabled,
}: {
  onPick: (listingId: string) => void
  attachedIds: Set<string>
  disabled: boolean
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<ListingResult[]>([])
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
        const params = new URLSearchParams({ q: q.trim(), pageSize: '8' })
        const res = await fetch(`/api/v1/listings?${params.toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: { rows: ListingResult[] } }
        setResults(json.data.rows)
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
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search listings by name…"
          className="w-full rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
        />
      </div>
      {q.trim() && (
        <ul className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[#E0DBD4]">
          {loading && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No listings found</li>
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
                    <span className="truncate">{r.nickname || r.name}</span>
                    {r.guestyId && (
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{r.guestyId}</span>
                    )}
                    {r.unitCount > 0 && !already && (
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">
                        on {r.unitCount} unit{r.unitCount === 1 ? '' : 's'}
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
