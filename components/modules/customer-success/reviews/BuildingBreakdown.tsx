'use client'

import { Star } from 'lucide-react'

interface Props {
  byBuilding: Array<{ buildingPrefix: string; count: number; avgRating: number | null }>
  /** Truncate to top N — defaults to 15 per plan. */
  limit?: number
}

function ratingTone(avg: number | null): string {
  if (avg == null) return 'text-muted-foreground'
  if (avg < 4)   return 'text-mvr-danger'
  if (avg < 4.5) return 'text-mvr-warning'
  return 'text-mvr-success'
}

export function BuildingBreakdown({ byBuilding, limit = 15 }: Props) {
  const slice = byBuilding.slice(0, limit)
  if (slice.length === 0) {
    return (
      <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
        <h3 className="text-sm font-semibold text-mvr-primary mb-2">By building</h3>
        <p className="text-xs text-muted-foreground">No reviews in the current filter.</p>
      </div>
    )
  }
  const max = Math.max(1, ...slice.map((b) => b.count))

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <h3 className="text-sm font-semibold text-mvr-primary mb-3">
        By building <span className="text-xs text-muted-foreground font-normal">(top {slice.length})</span>
      </h3>
      <ul className="space-y-1.5">
        {slice.map((b) => (
          <li key={b.buildingPrefix} className="flex items-center gap-3 text-sm">
            <span className="text-mvr-primary font-medium w-24 truncate" title={b.buildingPrefix}>
              {b.buildingPrefix}
            </span>
            <div className="flex-1 h-1.5 bg-mvr-cream rounded-full overflow-hidden">
              <div
                className="h-full bg-mvr-primary rounded-full"
                style={{ width: `${(b.count / max) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
              {b.count.toLocaleString()}
            </span>
            <span className={`text-xs w-14 text-right inline-flex items-center gap-0.5 justify-end font-medium ${ratingTone(b.avgRating)}`}>
              <Star className="w-3 h-3 fill-current" />
              {b.avgRating != null ? b.avgRating.toFixed(2) : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
