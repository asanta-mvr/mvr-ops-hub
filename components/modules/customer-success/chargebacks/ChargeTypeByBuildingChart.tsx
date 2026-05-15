'use client'

import { useMemo } from 'react'
import type { ChargeTypeByBuildingRow } from '@/lib/risk/queries'

interface Props {
  data: ChargeTypeByBuildingRow[]
}

// Categorical palette (MVR brand). Index 0 is reserved for the most common
// type across the dataset so the dominant slice carries the lead color.
const PALETTE: readonly string[] = [
  '#1E2D40', // mvr-primary (navy)
  '#2D6A4F', // mvr-success (green)
  '#B5541C', // mvr-warning (amber)
  '#A2B4C0', // mvr-steel
  '#8B2030', // mvr-danger (wine)
  '#CEC4B6', // mvr-sand
  '#2D2A1C', // mvr-olive
  '#5A3540', // wine-mid
]
const UNKNOWN_COLOR = '#A2B4C0' // mvr-steel for the "(unknown)" bucket

function pct(num: number, denom: number): string {
  if (denom === 0) return '0%'
  return `${((num / denom) * 100).toFixed(1)}%`
}

function humanType(t: string): string {
  if (t === '(unknown)') return 'Unknown type'
  return t
}

export function ChargeTypeByBuildingChart({ data }: Props) {
  // Order charge types by total volume across all buildings so the most common
  // type always gets the boldest color (and appears first in each bar).
  const orderedTypes = useMemo(() => {
    const totals = new Map<string, number>()
    for (const row of data) {
      for (const [type, count] of Object.entries(row.counts)) {
        totals.set(type, (totals.get(type) ?? 0) + count)
      }
    }
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type]) => type)
  }, [data])

  const colorByType = useMemo(() => {
    const out: Record<string, string> = {}
    let idx = 0
    for (const t of orderedTypes) {
      if (t === '(unknown)') {
        out[t] = UNKNOWN_COLOR
      } else {
        out[t] = PALETTE[idx % PALETTE.length]
        idx++
      }
    }
    return out
  }, [orderedTypes])

  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No transactions match the current scope.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2.5">
        {data.map((row) => (
          <div key={row.building} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium text-mvr-primary">{row.building}</span>
              <span className="text-[11px] text-muted-foreground font-mono">
                {row.total.toLocaleString()} tx
              </span>
            </div>
            <div
              className="flex w-full h-5 rounded-md overflow-hidden border border-[#E0DBD4] bg-mvr-neutral"
              role="img"
              aria-label={`${row.building}: ${orderedTypes
                .filter((t) => (row.counts[t] ?? 0) > 0)
                .map((t) => `${humanType(t)} ${pct(row.counts[t] ?? 0, row.total)}`)
                .join(', ')}`}
            >
              {orderedTypes.map((type) => {
                const count = row.counts[type] ?? 0
                if (count === 0) return null
                const p = (count / row.total) * 100
                return (
                  <div
                    key={`${row.building}-${type}`}
                    title={`${humanType(type)} — ${count.toLocaleString()} (${pct(count, row.total)})`}
                    style={{ flexBasis: `${p}%`, backgroundColor: colorByType[type] ?? UNKNOWN_COLOR }}
                    className="flex items-center justify-center text-white text-[10px] font-semibold tracking-tight"
                  >
                    {p >= 12 && pct(count, row.total)}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 border-t border-[#E0DBD4]">
        {orderedTypes.map((type) => (
          <div key={`legend-${type}`} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block w-3 h-3 rounded-sm ring-1 ring-black/10"
              style={{ backgroundColor: colorByType[type] ?? UNKNOWN_COLOR }}
            />
            <span className="text-xs text-muted-foreground">{humanType(type)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
