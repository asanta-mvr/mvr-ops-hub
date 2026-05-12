'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export interface WatchlistRow {
  id: string
  email: string | null
  cardLast4: string | null
  lossUsd: number | null
  reason: string | null
  createdAt: string
  createdByName: string | null
}

interface Props {
  initial: WatchlistRow[]
}

export function WatchlistPanel({ initial }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<WatchlistRow[]>(initial)
  const [email, setEmail] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [lossUsd, setLossUsd] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function add() {
    if (!email.trim() && !cardLast4.trim()) {
      toast.error('Email or card last 4 is required')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/v1/risk/watchlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          cardLast4: cardLast4.trim() || undefined,
          lossUsd: lossUsd ? Number(lossUsd) : undefined,
          reason: reason.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Could not add')
        return
      }
      setRows((prev) => [json.data, ...prev])
      setEmail('')
      setCardLast4('')
      setLossUsd('')
      setReason('')
      toast.success('Added to watchlist')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Remove this entry?')) return
    try {
      const res = await fetch(`/api/v1/risk/watchlist/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Could not remove')
        return
      }
      setRows((prev) => prev.filter((r) => r.id !== id))
      toast.success('Removed')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
      <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
        Watchlist
      </div>
      <h3 className="font-display text-lg text-mvr-primary mb-1">Manually blocked guests</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Curated list of customers to block at booking. Persisted server-side.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_3fr_auto] gap-2 mb-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
        <input
          type="text"
          placeholder="Card ••1234"
          value={cardLast4}
          onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
          className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
        <input
          type="number"
          placeholder="Loss USD"
          value={lossUsd}
          onChange={(e) => setLossUsd(e.target.value)}
          min={0}
          step="0.01"
          className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 disabled:opacity-40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
          Watchlist is empty.
        </p>
      ) : (
        <div className="overflow-x-auto border border-[#E0DBD4] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2.5 px-3 text-left">Identifier</th>
                <th className="py-2.5 px-2 text-right">Loss</th>
                <th className="py-2.5 px-2 text-left">Reason</th>
                <th className="py-2.5 px-2 text-left">Added</th>
                <th className="py-2.5 px-2 text-left">By</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-neutral/40">
                  <td className="py-2 px-3 text-mvr-primary">
                    {r.email && <div>{r.email}</div>}
                    {r.cardLast4 && <div className="font-mono text-xs text-muted-foreground">card ••{r.cardLast4}</div>}
                  </td>
                  <td className="py-2 px-2 text-right font-display text-mvr-primary">
                    {r.lossUsd ? formatCurrency(r.lossUsd) : '—'}
                  </td>
                  <td className="py-2 px-2 text-xs text-mvr-olive">{r.reason ?? '—'}</td>
                  <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="py-2 px-2 text-xs text-muted-foreground">{r.createdByName ?? '—'}</td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => remove(r.id)}
                      className="p-1 rounded hover:bg-mvr-danger-light text-muted-foreground hover:text-mvr-danger transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
