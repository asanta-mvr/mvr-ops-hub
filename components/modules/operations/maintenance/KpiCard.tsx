'use client'

import type { LucideIcon } from 'lucide-react'

interface Props {
  label:  string
  value:  string
  sub?:   string
  icon?:  LucideIcon
  accent?: 'primary' | 'success' | 'warning' | 'danger' | 'steel' | 'sand'
}

const ACCENT_TEXT: Record<NonNullable<Props['accent']>, string> = {
  primary: 'text-mvr-primary',
  success: 'text-mvr-success',
  warning: 'text-mvr-warning',
  danger:  'text-mvr-danger',
  steel:   'text-mvr-steel',
  sand:    'text-[#CEC4B6]',
}

export function KpiCard({ label, value, sub, icon: Icon, accent = 'primary' }: Props) {
  const tone = ACCENT_TEXT[accent]
  return (
    <div className="rounded-xl bg-white border border-[#E0DBD4] p-4 shadow-card">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
          <div className={`text-xl font-display mt-1 ${tone}`}>{value}</div>
          {sub ? <div className="text-[11px] text-muted-foreground mt-1">{sub}</div> : null}
        </div>
        {Icon ? <Icon className={`w-4 h-4 shrink-0 ${tone} opacity-50`} /> : null}
      </div>
    </div>
  )
}
