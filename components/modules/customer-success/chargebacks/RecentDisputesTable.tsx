'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'

export interface RecentDispute {
  id: string
  reason: string
  amountCents: number
  currency: string
  status: string
  recommendation: string | null
  confidence: string | null
  createdAt: Date
  evidenceDueBy: Date | null
  transaction: {
    id: string
    customerId: string | null
    bookingId: string | null
    riskLevel: string | null
    riskScore: number | null
    outcomeReason: string | null
  } | null
}

interface Props {
  disputes: RecentDispute[]
}

function humanReason(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusBadge(s: string) {
  const lo = s.toLowerCase()
  if (lo === 'won')
    return 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
  if (lo === 'lost')
    return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  if (lo === 'warning_closed')
    return 'bg-mvr-neutral text-mvr-olive border-[#E0DBD4]'
  return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
}

function riskBadge(level: string | null) {
  if (!level) return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
  if (level === 'highest')
    return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  if (level === 'elevated')
    return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
  return 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
}

export function RecentDisputesTable({ disputes }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [channel, setChannel] = useState('')
  const [sending, setSending] = useState(false)

  const allSelected = useMemo(
    () => disputes.length > 0 && selected.size === disputes.length,
    [disputes.length, selected.size]
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(disputes.map((d) => d.id)))
  }

  async function sendAlert() {
    if (!channel.trim()) {
      toast.error('Enter a Slack channel ID first')
      return
    }
    if (selected.size === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/v1/risk/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          disputeIds: Array.from(selected),
          channel: channel.trim(),
          priority: 'normal',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to send alert')
        return
      }
      toast.success(`Alert queued for ${selected.size} dispute(s)`)
      setSelected(new Set())
    } catch (e) {
      toast.error('Network error — alert not sent')
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  if (disputes.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No disputes in this period.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="text"
          placeholder="Slack channel ID (e.g. C098R8ZMZTL)"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 min-w-[260px] focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
        <button
          type="button"
          onClick={sendAlert}
          disabled={selected.size === 0 || sending}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Sending…' : `Alert ${selected.size > 0 ? `(${selected.size})` : 'selected'}`}
        </button>
        <span className="text-xs text-muted-foreground ml-auto">
          Posts to n8n webhook → Slack. Read-only on Stripe data.
        </span>
      </div>

      <div className="overflow-x-auto border border-[#E0DBD4] rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="py-2.5 pl-4 text-left w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="accent-mvr-primary"
                />
              </th>
              <th className="py-2.5 px-2 text-left">Date</th>
              <th className="py-2.5 px-2 text-left">Reason</th>
              <th className="py-2.5 px-2 text-left">Customer / Charge</th>
              <th className="py-2.5 px-2 text-right">Amount</th>
              <th className="py-2.5 px-2 text-left">Risk</th>
              <th className="py-2.5 px-2 text-left">Status</th>
              <th className="py-2.5 px-2 pr-4 text-left">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => (
              <tr
                key={d.id}
                className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-neutral/40 transition-colors"
              >
                <td className="py-2.5 pl-4">
                  <input
                    type="checkbox"
                    checked={selected.has(d.id)}
                    onChange={() => toggle(d.id)}
                    className="accent-mvr-primary"
                  />
                </td>
                <td className="py-2.5 px-2 text-mvr-olive whitespace-nowrap">
                  {formatDate(d.createdAt)}
                </td>
                <td className="py-2.5 px-2 text-mvr-primary font-medium">
                  {humanReason(d.reason)}
                </td>
                <td className="py-2.5 px-2 text-mvr-olive">
                  <div className="font-mono text-xs">{d.transaction?.customerId ?? '—'}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">{d.transaction?.id ?? d.id}</div>
                </td>
                <td className="py-2.5 px-2 text-right text-mvr-primary font-display">
                  {formatCurrency(d.amountCents / 100, d.currency.toUpperCase())}
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${riskBadge(d.transaction?.riskLevel ?? null)}`}
                  >
                    {d.transaction?.riskLevel ?? 'n/a'}
                  </span>
                </td>
                <td className="py-2.5 px-2">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusBadge(d.status)}`}
                  >
                    {d.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="py-2.5 px-2 pr-4 text-xs text-mvr-olive">
                  {d.recommendation ? (
                    <span>
                      {d.recommendation}{' '}
                      {d.confidence && (
                        <span className="text-muted-foreground">({d.confidence})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
