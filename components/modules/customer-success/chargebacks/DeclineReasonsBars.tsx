'use client'

import type { PaymentsSummary } from '@/lib/risk/queries'

interface Props {
  data: PaymentsSummary['declineReasons']
}

function humanReason(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function DeclineReasonsBars({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No failed charges in this period.
      </div>
    )
  }
  const max = Math.max(...data.map((r) => r.count))
  return (
    <div className="space-y-2">
      {data.map((r) => {
        const pct = max === 0 ? 0 : (r.count / max) * 100
        return (
          <div key={r.reason} className="grid grid-cols-[160px_1fr_auto] gap-3 items-center text-xs">
            <span className="text-mvr-primary font-medium truncate" title={humanReason(r.reason)}>
              {humanReason(r.reason)}
            </span>
            <div className="bg-mvr-neutral rounded-full h-2 overflow-hidden">
              <div className="h-full bg-mvr-danger rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-mvr-primary font-display text-sm whitespace-nowrap">
              {r.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}
