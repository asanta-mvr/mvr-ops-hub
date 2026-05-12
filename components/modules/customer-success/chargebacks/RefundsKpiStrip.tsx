'use client'

import { RotateCcw, DollarSign, Percent, Clock } from 'lucide-react'
import type { RefundsSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  kpis: RefundsSummary['kpis']
}

export function RefundsKpiStrip({ kpis }: Props) {
  const stats = [
    {
      label: 'Total refunded',
      value: formatCurrency(kpis.totalRefundsAmountCents / 100),
      sub: `${kpis.totalRefundsCount.toLocaleString()} refund${kpis.totalRefundsCount === 1 ? '' : 's'}`,
      icon: DollarSign,
      tone: 'primary' as const,
    },
    {
      label: 'Refund count',
      value: kpis.totalRefundsCount.toLocaleString(),
      sub: 'in period',
      icon: RotateCcw,
      tone: 'warning' as const,
    },
    {
      label: '% of succeeded',
      value: kpis.pctOfSucceeded === null ? '—' : `${kpis.pctOfSucceeded.toFixed(1)}%`,
      sub: 'refund rate',
      icon: Percent,
      tone: kpis.pctOfSucceeded !== null && kpis.pctOfSucceeded > 15 ? ('danger' as const) : ('warning' as const),
    },
    {
      label: 'Avg time to refund',
      value: kpis.avgRefundDays === null ? '—' : `${kpis.avgRefundDays.toFixed(1)} d`,
      sub: 'from charge date',
      icon: Clock,
      tone: 'primary' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map((s) => {
        const Icon = s.icon
        const valueColor =
          s.tone === 'danger'
            ? 'text-mvr-danger'
            : s.tone === 'warning'
              ? 'text-mvr-warning'
              : 'text-mvr-primary'
        return (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-[#E0DBD4] shadow-card px-4 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                {s.label}
              </span>
              <Icon className="w-4 h-4 text-mvr-sand" />
            </div>
            <p className={`font-display text-2xl ${valueColor}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        )
      })}
    </div>
  )
}
