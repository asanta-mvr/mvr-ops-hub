'use client'

import { CreditCard, CheckCircle2, XCircle, Activity, ShieldAlert } from 'lucide-react'
import type { PaymentsSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  kpis: PaymentsSummary['kpis']
}

type Tone = 'primary' | 'success' | 'danger' | 'warning'

function pct(num: number, denom: number): string {
  if (denom === 0) return '—'
  return `${((num / denom) * 100).toFixed(1)}%`
}

const TONE_VALUE: Record<Tone, string> = {
  primary: 'text-mvr-primary',
  success: 'text-mvr-success',
  danger: 'text-mvr-danger',
  warning: 'text-mvr-warning',
}

export function PaymentsKpiStrip({ kpis }: Props) {
  const stats: Array<{
    label: string
    value: string
    sub: string
    icon: typeof CreditCard
    tone: Tone
  }> = [
    {
      label: 'Total volume',
      value: formatCurrency(kpis.totalVolumeCents / 100),
      sub: `${kpis.totalCount.toLocaleString()} charges`,
      icon: CreditCard,
      tone: 'primary',
    },
    {
      label: 'Succeeded',
      value: formatCurrency(kpis.succeededVolumeCents / 100),
      sub: `${kpis.succeededCount.toLocaleString()} · ${pct(kpis.succeededCount, kpis.totalCount)}`,
      icon: CheckCircle2,
      tone: 'success',
    },
    {
      label: 'Failed',
      value: formatCurrency(kpis.failedVolumeCents / 100),
      sub: `${kpis.failedCount.toLocaleString()} · ${pct(kpis.failedCount, kpis.totalCount)}`,
      icon: XCircle,
      tone: 'danger',
    },
    {
      label: 'Fail rate',
      value: `${kpis.failRatePct.toFixed(1)}%`,
      sub: 'of all charges',
      icon: Activity,
      tone: kpis.failRatePct > 10 ? 'danger' : 'warning',
    },
    {
      label: 'High risk',
      value: kpis.highRiskCount.toLocaleString(),
      sub: `${pct(kpis.highRiskCount, kpis.totalCount)} of all`,
      icon: ShieldAlert,
      tone: 'warning',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => {
        const Icon = s.icon
        const valueColor = TONE_VALUE[s.tone]
        return (
          <div
            key={s.label}
            className="bg-white rounded-xl border border-[#E0DBD4] shadow-card px-4 py-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                {s.label}
              </span>
              <Icon className="w-4 h-4 text-mvr-sand" aria-hidden />
            </div>
            <p className={`font-display text-2xl ${valueColor}`}>{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{s.sub}</p>
          </div>
        )
      })}
    </div>
  )
}
