'use client'

import type { RiskSummary } from '@/lib/risk/queries'

interface Props {
  data: RiskSummary['reasonsByWinRate']
}

function humanReason(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ReasonWinRateBars({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No resolved disputes yet.
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      {data.map((r) => {
        const total = r.won + r.lost
        const wonPct = (r.won / total) * 100
        return (
          <div key={r.reason} className="grid grid-cols-[140px_1fr_auto] gap-3 items-center text-xs">
            <span className="text-mvr-primary font-medium truncate" title={humanReason(r.reason)}>
              {humanReason(r.reason)}
            </span>
            <div className="bg-mvr-neutral rounded-full h-2 overflow-hidden flex">
              <div className="h-full bg-mvr-success" style={{ width: `${wonPct}%` }} />
              <div className="h-full bg-mvr-danger" style={{ width: `${100 - wonPct}%` }} />
            </div>
            <span className="text-mvr-primary font-display text-sm whitespace-nowrap">
              {r.winRate.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}
