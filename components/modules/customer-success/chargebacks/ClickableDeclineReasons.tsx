'use client'

import { Check } from 'lucide-react'
import type { PaymentsSummary } from '@/lib/risk/queries'

interface Props {
  data: PaymentsSummary['declineReasons']
  selected: string[]
  onChange: (next: string[]) => void
}

function humanReason(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ClickableDeclineReasons({ data, selected, onChange }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No failed charges in this period.
      </div>
    )
  }

  function toggle(reason: string) {
    if (selected.includes(reason)) {
      onChange(selected.filter((r) => r !== reason))
    } else {
      onChange([...selected, reason])
    }
  }

  const max = Math.max(...data.map((r) => r.count))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>Click a reason to filter the table below</span>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-mvr-primary hover:underline normal-case tracking-normal text-xs"
          >
            Clear ({selected.length})
          </button>
        )}
      </div>
      {data.map((r) => {
        const pct = max === 0 ? 0 : (r.count / max) * 100
        const isSelected = selected.includes(r.reason)
        return (
          <button
            key={r.reason}
            type="button"
            onClick={() => toggle(r.reason)}
            className={`w-full grid grid-cols-[20px_160px_1fr_auto] gap-3 items-center text-xs rounded-md px-2 py-1.5 transition-colors text-left ${
              isSelected
                ? 'bg-mvr-primary-light border border-mvr-primary'
                : 'hover:bg-mvr-cream border border-transparent'
            }`}
          >
            <span
              className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border ${
                isSelected
                  ? 'bg-mvr-primary border-mvr-primary text-white'
                  : 'border-[#E0DBD4] bg-white'
              }`}
              aria-hidden
            >
              {isSelected && <Check className="w-3 h-3" />}
            </span>
            <span className="text-mvr-primary font-medium truncate" title={humanReason(r.reason)}>
              {humanReason(r.reason)}
            </span>
            <div className="bg-mvr-neutral rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${isSelected ? 'bg-mvr-primary' : 'bg-mvr-danger'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-mvr-primary font-display text-sm whitespace-nowrap">
              {r.count.toLocaleString()}
            </span>
          </button>
        )
      })}
    </div>
  )
}
