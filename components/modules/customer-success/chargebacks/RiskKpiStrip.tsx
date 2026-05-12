'use client'

import { DollarSign, TrendingUp, TrendingDown, Clock, Trophy } from 'lucide-react'
import type { RiskSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  kpis: RiskSummary['kpis']
}

export function RiskKpiStrip({ kpis }: Props) {
  const stats = [
    {
      label: 'Total disputed',
      value: formatCurrency(kpis.totalDisputed / 100),
      sub: `${kpis.totalCount} ${kpis.totalCount === 1 ? 'case' : 'cases'}`,
      icon: DollarSign,
      tone: 'primary' as const,
    },
    {
      label: 'Recovered',
      value: formatCurrency(kpis.recovered / 100),
      sub: `${kpis.recoveredCount} won`,
      icon: TrendingUp,
      tone: 'success' as const,
    },
    {
      label: 'Net loss',
      value: formatCurrency(kpis.netLoss / 100),
      sub: `${kpis.lostCount} lost`,
      icon: TrendingDown,
      tone: 'danger' as const,
    },
    {
      label: 'Pending',
      value: formatCurrency(kpis.pending / 100),
      sub: `${kpis.pendingCount} open`,
      icon: Clock,
      tone: 'warning' as const,
    },
    {
      label: 'Win rate',
      value: kpis.winRatePct === null ? '—' : `${kpis.winRatePct.toFixed(1)}%`,
      sub: 'won / resolved',
      icon: Trophy,
      tone: 'primary' as const,
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => {
        const Icon = s.icon
        const valueColor =
          s.tone === 'success'
            ? 'text-mvr-success'
            : s.tone === 'danger'
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
