'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { PainPointRow } from '@/lib/reviews/types'
import { SectionCard, fmtPct } from './performanceShared'

interface Props {
  painPoints: PainPointRow[]
}

// For pain points, MORE mentions is worse — so a rise is danger (red), a fall
// is success (green). Inverse of the generic Delta in performanceShared.
function PainTrend({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
        <ArrowRight className="w-3 h-3" />0
      </span>
    )
  }
  const worse = diff > 0
  const Icon  = worse ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${worse ? 'text-mvr-danger' : 'text-mvr-success'}`}>
      <Icon className="w-3 h-3" />
      {diff > 0 ? '+' : ''}{diff}
    </span>
  )
}

function belowFiveTone(v: number | null): string {
  if (v == null) return 'text-muted-foreground'
  if (v >= 0.75) return 'text-mvr-danger'
  if (v >= 0.4)  return 'text-mvr-warning'
  return 'text-mvr-olive'
}

export function PainPoints({ painPoints }: Props) {
  const maxShare = Math.max(0.01, ...painPoints.map((p) => p.sharePct ?? 0))

  return (
    <SectionCard
      title="Operational pain points"
      subtitle="Top negative themes over the last 4 weeks — how many reviews and guests raise each, how often it coincides with a sub-5★ review, and the trend vs the prior 4 weeks. Remediation tracking (what we're doing about it) will live in Support Tickets."
    >
      {painPoints.length === 0 ? (
        <p className="text-sm text-muted-foreground">No negative themes in range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-[#E0DBD4]">
                <th className="text-left font-medium py-2">Theme</th>
                <th className="text-right font-medium py-2 px-2">Reviews</th>
                <th className="text-right font-medium py-2 px-2">vs prior</th>
                <th className="text-right font-medium py-2 px-2">Guests</th>
                <th className="text-right font-medium py-2 px-2">% &lt; 5★</th>
                <th className="text-left font-medium py-2 px-2 w-28">Share</th>
                <th className="text-right font-medium py-2 px-2">Remediation</th>
              </tr>
            </thead>
            <tbody>
              {painPoints.map((p) => (
                <tr key={p.tag} className="border-b border-[#EFEBE4] last:border-0">
                  <td className="py-2 font-medium text-mvr-primary">{p.tag}</td>
                  <td className="text-right tabular-nums text-mvr-primary py-2 px-2">{p.reviews}</td>
                  <td className="text-right py-2 px-2"><PainTrend current={p.reviews} previous={p.prevReviews} /></td>
                  <td className="text-right tabular-nums text-muted-foreground py-2 px-2">{p.guests}</td>
                  <td className={`text-right tabular-nums font-medium py-2 px-2 ${belowFiveTone(p.belowFiveStarPct)}`}>
                    {fmtPct(p.belowFiveStarPct)}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-mvr-cream rounded-full overflow-hidden">
                        <div className="h-full bg-mvr-danger/70 rounded-full" style={{ width: `${((p.sharePct ?? 0) / maxShare) * 100}%` }} />
                      </div>
                      <span className="text-[11px] tabular-nums text-muted-foreground w-9 text-right">{fmtPct(p.sharePct, 1)}</span>
                    </div>
                  </td>
                  <td className="text-right py-2 px-2">
                    <span className="text-[11px] text-muted-foreground/70 italic">Tickets · soon</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  )
}
