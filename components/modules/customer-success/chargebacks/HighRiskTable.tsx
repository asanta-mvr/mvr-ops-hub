'use client'

import { formatCurrency, formatDate } from '@/lib/utils/format'

export interface HighRiskCharge {
  id: string
  paymentIntent: string | null
  customerId: string | null
  bookingId: string | null
  amountCents: number
  currency: string
  status: string
  riskLevel: string | null
  riskScore: number | null
  outcomeReason: string | null
  createdAt: Date
}

interface Props {
  charges: HighRiskCharge[]
}

function humanReason(r: string | null): string {
  if (!r) return '—'
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function riskBadge(level: string | null) {
  if (level === 'highest')
    return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  if (level === 'elevated')
    return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
  return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
}

function statusBadge(s: string) {
  if (s === 'succeeded') return 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
  if (s === 'failed') return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
}

export function HighRiskTable({ charges }: Props) {
  if (charges.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No elevated or highest-risk charges in this period.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-[#E0DBD4] rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
            <th className="py-2.5 px-3 text-left">Date</th>
            <th className="py-2.5 px-2 text-left">Charge / Customer</th>
            <th className="py-2.5 px-2 text-right">Amount</th>
            <th className="py-2.5 px-2 text-left">Risk</th>
            <th className="py-2.5 px-2 text-left">Score</th>
            <th className="py-2.5 px-2 text-left">Status</th>
            <th className="py-2.5 px-3 text-left">Reason</th>
          </tr>
        </thead>
        <tbody>
          {charges.map((c) => (
            <tr
              key={c.id}
              className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-neutral/40 transition-colors"
            >
              <td className="py-2.5 px-3 text-mvr-olive whitespace-nowrap">{formatDate(c.createdAt)}</td>
              <td className="py-2.5 px-2 text-mvr-olive">
                <div className="font-mono text-[10px] text-mvr-primary">{c.id}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{c.customerId ?? '—'}</div>
              </td>
              <td className="py-2.5 px-2 text-right text-mvr-primary font-display">
                {formatCurrency(c.amountCents / 100, c.currency.toUpperCase())}
              </td>
              <td className="py-2.5 px-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${riskBadge(c.riskLevel)}`}
                >
                  {c.riskLevel ?? 'n/a'}
                </span>
              </td>
              <td className="py-2.5 px-2 text-mvr-olive font-mono text-xs">{c.riskScore ?? '—'}</td>
              <td className="py-2.5 px-2">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusBadge(c.status)}`}
                >
                  {c.status}
                </span>
              </td>
              <td className="py-2.5 px-3 text-xs text-mvr-olive">{humanReason(c.outcomeReason)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
