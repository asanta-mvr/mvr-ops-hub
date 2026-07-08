'use client'

import { TrendingUp } from 'lucide-react'
import type { EmergingStrength } from '@/lib/reviews/types'
import { SectionCard } from './performanceShared'

interface Props {
  strengths: EmergingStrength[]
}

export function EmergingStrengths({ strengths }: Props) {
  return (
    <SectionCard
      title="Emerging strengths"
      subtitle="Positive themes guests are mentioning more than in prior weeks — what's newly resonating, not the evergreens. Rule-based on review tags (last 4 weeks vs the prior 8)."
    >
      {strengths.length === 0 ? (
        <p className="text-sm text-muted-foreground">No themes rose meaningfully vs prior weeks.</p>
      ) : (
        <ul className="space-y-2">
          {strengths.map((s) => (
            <li
              key={s.tag}
              className="flex items-center justify-between gap-3 rounded-lg border border-[#EFEBE4] bg-mvr-success-light/40 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <TrendingUp className="w-4 h-4 text-mvr-success flex-shrink-0" />
                <span className="text-sm font-medium text-mvr-primary truncate">{s.tag}</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-xs text-muted-foreground tabular-nums">{s.currentCount} mentions</span>
                <span className="text-xs font-semibold text-mvr-success tabular-nums">
                  +{(s.delta * 100).toFixed(1)}pt
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}
