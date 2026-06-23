'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight } from 'lucide-react'
import type { ListingPanelData } from './ListingDataMasterPanel'

// One comparable field: the Data Master (source-of-truth) value vs the latest
// Guesty snapshot value. Differences are highlighted; copying is explicit.
export interface DriftRow {
  label: string
  field: keyof ListingPanelData | 'sqrFeet' | 'totalOccupancy'
  dmVal: string | number | null
  guestyVal: string | number | null
}

export default function ListingRecordDrift({
  listingId,
  editable,
  rows,
}: {
  listingId: string
  editable: boolean
  rows: DriftRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<'all' | 'different' | 'inSync'>('all')

  const isDifferent = (dm: string | number | null, g: string | number | null): boolean => {
    if (g === null || g === undefined || g === '') return false
    if (dm === null || dm === undefined || dm === '') return true
    if (typeof dm === 'number' || typeof g === 'number') return Number(dm) !== Number(g)
    return String(dm).trim().toLowerCase() !== String(g).trim().toLowerCase()
  }
  const diffCount = rows.filter((r) => isDifferent(r.dmVal, r.guestyVal)).length
  const inSyncCount = rows.length - diffCount

  const visibleRows = rows.filter((r) => {
    if (filter === 'all') return true
    const d = isDifferent(r.dmVal, r.guestyVal)
    return filter === 'different' ? d : !d
  })

  async function copy(field: DriftRow['field'], value: string | number) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not update')
        return
      }
      toast.success('Field updated from Guesty')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-mvr-primary">Data Master vs Guesty</h3>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            diffCount > 0 ? 'bg-mvr-warning-light text-mvr-warning' : 'bg-mvr-success-light text-mvr-success'
          }`}
        >
          <ArrowLeftRight className="size-3" />
          {inSyncCount} in sync · {diffCount} different
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Data Master is the source of truth. Guesty values are shown for reference; copy one only if you
        want to change Data Master.
      </p>

      {/* Filter */}
      <div className="mt-3 inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
        {(
          [
            ['all', `All (${rows.length})`],
            ['different', `Different (${diffCount})`],
            ['inSync', `In sync (${inSyncCount})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filter === key ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 font-medium">Field</th>
            <th className="py-1.5 font-medium">Data Master</th>
            <th className="py-1.5 font-medium">Guesty</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-center text-xs text-muted-foreground">
                Nothing to show in this view.
              </td>
            </tr>
          )}
          {visibleRows.map((r) => {
            const differ = isDifferent(r.dmVal, r.guestyVal)
            return (
              <tr key={r.label} className={`border-t border-[#E0DBD4]/60 ${differ ? 'bg-mvr-warning-light/40' : ''}`}>
                <td className="py-2 text-mvr-olive">{r.label}</td>
                <td className="max-w-[8rem] truncate py-2 font-medium text-mvr-olive">{r.dmVal ?? '—'}</td>
                <td className={`max-w-[8rem] truncate py-2 ${differ ? 'text-mvr-warning' : 'text-muted-foreground'}`}>
                  {r.guestyVal ?? '—'}
                </td>
                <td className="py-2 text-right">
                  {editable && differ && r.guestyVal !== null && r.guestyVal !== '' && (
                    <button
                      type="button"
                      onClick={() => copy(r.field, r.guestyVal as string | number)}
                      disabled={busy}
                      title="Copy this Guesty value into Data Master"
                      className="inline-flex items-center gap-1 rounded-full border border-[#E0DBD4] px-2 py-0.5 text-xs text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:opacity-50"
                    >
                      use Guesty
                    </button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
