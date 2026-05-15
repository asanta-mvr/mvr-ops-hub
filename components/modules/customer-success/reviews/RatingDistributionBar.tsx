'use client'

import { Star } from 'lucide-react'

interface Props {
  buckets: Record<'1' | '2' | '3' | '4' | '5', number>
}

const ORDER: Array<keyof Props['buckets']> = ['5', '4', '3', '2', '1']

// Bar fill per row — green at the top, red at the bottom.
const BAR_FILL: Record<keyof Props['buckets'], string> = {
  '5': 'bg-mvr-success',
  '4': 'bg-mvr-success',
  '3': 'bg-mvr-warning',
  '2': 'bg-mvr-danger',
  '1': 'bg-mvr-danger',
}

const LABEL_TONE: Record<keyof Props['buckets'], string> = {
  '5': 'text-mvr-success',
  '4': 'text-mvr-success',
  '3': 'text-mvr-warning',
  '2': 'text-mvr-danger',
  '1': 'text-mvr-danger',
}

export function RatingDistributionBar({ buckets }: Props) {
  const total = ORDER.reduce((s, k) => s + buckets[k], 0)
  const max   = Math.max(1, ...ORDER.map((k) => buckets[k]))

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <h3 className="text-sm font-semibold text-mvr-primary mb-3">Rating distribution</h3>
      {total === 0 ? (
        <p className="text-xs text-muted-foreground">No reviews in the current filter.</p>
      ) : (
        <ul className="space-y-2">
          {ORDER.map((k) => {
            const n   = buckets[k]
            const pct = (n / total) * 100
            const w   = (n / max) * 100
            return (
              <li key={k} className="flex items-center gap-3 text-sm">
                <span className={`inline-flex items-center gap-0.5 w-12 font-semibold ${LABEL_TONE[k]}`}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {k}
                </span>
                <div className="flex-1 h-2 bg-mvr-cream rounded-full overflow-hidden">
                  <div
                    className={`h-full ${BAR_FILL[k]} rounded-full`}
                    style={{ width: `${w}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-16 text-right tabular-nums">
                  {n.toLocaleString()}
                </span>
                <span className="text-xs text-mvr-primary w-14 text-right tabular-nums font-medium">
                  {pct.toFixed(1)}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
