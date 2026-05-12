'use client'

import type { RiskSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  data: RiskSummary['reasonsByAmount']
}

function humanReason(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function TopReasonsByAmount({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No reasons recorded yet.
      </div>
    )
  }
  const max = Math.max(...data.map((r) => r.amountCents))
  return (
    <div className="space-y-2">
      {data.map((r) => {
        const pct = max === 0 ? 0 : (r.amountCents / max) * 100
        return (
          <div key={r.reason} className="grid grid-cols-[140px_1fr_auto] gap-3 items-center text-xs">
            <span className="text-mvr-primary font-medium truncate" title={humanReason(r.reason)}>
              {humanReason(r.reason)}
            </span>
            <div className="bg-mvr-neutral rounded-full h-2 overflow-hidden">
              <div className="h-full bg-mvr-sand rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-mvr-primary font-display text-sm whitespace-nowrap">
              {formatCurrency(r.amountCents / 100)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
