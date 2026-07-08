'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, Star } from 'lucide-react'
import type { CohortSegmentDim, CohortSegmentRow } from '@/lib/reviews/types'
import { Delta, OTA_ICON, SectionCard, fmtPct, fmtRating, otaFromLabel, rateTone } from './performanceShared'

interface Props {
  channelSegments:  CohortSegmentRow[]
  buildingSegments: CohortSegmentRow[]
}

function Toggle({ dim, onChange }: { dim: CohortSegmentDim; onChange: (d: CohortSegmentDim) => void }) {
  const opts: Array<{ key: CohortSegmentDim; label: string }> = [
    { key: 'channel',  label: 'By channel' },
    { key: 'building', label: 'By building' },
  ]
  return (
    <div className="inline-flex rounded-lg border border-[#E0DBD4] p-0.5 bg-mvr-cream">
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
            dim === o.key ? 'bg-white text-mvr-primary shadow-card' : 'text-muted-foreground hover:text-mvr-primary'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function SegmentPerformance({ channelSegments, buildingSegments }: Props) {
  const [dim, setDim] = useState<CohortSegmentDim>('channel')
  const rows = dim === 'channel' ? channelSegments : buildingSegments
  const maxShare = Math.max(0.01, ...rows.map((r) => r.reviewShare ?? 0))
  const outliers = rows.filter((r) => r.isOutlier && r.assessment)

  return (
    <SectionCard
      title="Performance by segment"
      subtitle="Last 4 complete weeks (checkout cohort). Review rate and avg rating shown with the change vs the prior 4 weeks."
      right={<Toggle dim={dim} onChange={setDim} />}
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No checkout data in range.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b border-[#E0DBD4]">
                <th className="text-left font-medium py-2">{dim === 'channel' ? 'Channel' : 'Building'}</th>
                <th className="text-right font-medium py-2 px-2">Checkouts</th>
                <th className="text-right font-medium py-2 px-2">Reviews</th>
                <th className="text-right font-medium py-2 px-2">Review rate</th>
                <th className="text-right font-medium py-2 px-2">Avg rating</th>
                <th className="text-right font-medium py-2 px-2">5★</th>
                <th className="text-left font-medium py-2 px-2 w-32">Share of reviews</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ota  = dim === 'channel' ? otaFromLabel(r.key) : null
                const icon = ota ? OTA_ICON[ota] : null
                return (
                  <tr
                    key={r.key}
                    className={`border-b border-[#EFEBE4] last:border-0 ${r.isOutlier ? 'bg-mvr-danger-light/40' : ''}`}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {icon ? (
                          <span className="w-6 h-6 rounded-md bg-mvr-cream flex items-center justify-center overflow-hidden flex-shrink-0">
                            <Image src={icon} alt="" width={24} height={24} className="object-contain" />
                          </span>
                        ) : null}
                        <span className="font-medium text-mvr-primary">{r.key}</span>
                        {r.isOutlier ? <AlertTriangle className="w-3.5 h-3.5 text-mvr-danger" /> : null}
                      </div>
                    </td>
                    <td className="text-right tabular-nums text-muted-foreground py-2 px-2">{r.reservations.toLocaleString()}</td>
                    <td className="text-right tabular-nums text-mvr-primary py-2 px-2">{r.reviews.toLocaleString()}</td>
                    <td className="text-right py-2 px-2">
                      <div className="flex flex-col items-end leading-tight">
                        <span className={`tabular-nums font-medium ${rateTone(r.reviewRate, 0.4, 0.3)}`}>{fmtPct(r.reviewRate)}</span>
                        <Delta current={r.reviewRate} previous={r.prevReviewRate} kind="point" />
                      </div>
                    </td>
                    <td className="text-right py-2 px-2">
                      <div className="flex flex-col items-end leading-tight">
                        <span className="tabular-nums font-medium text-mvr-olive inline-flex items-center gap-0.5">
                          {r.avgRating != null ? <Star className="w-3 h-3 fill-current text-mvr-warning" /> : null}
                          {fmtRating(r.avgRating)}
                        </span>
                        <Delta current={r.avgRating} previous={r.prevAvgRating} kind="rating" />
                      </div>
                    </td>
                    <td className="text-right tabular-nums text-muted-foreground py-2 px-2">{fmtPct(r.fiveStarRate)}</td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-mvr-cream rounded-full overflow-hidden">
                          <div
                            className="h-full bg-mvr-steel rounded-full"
                            style={{ width: `${((r.reviewShare ?? 0) / maxShare) * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] tabular-nums text-muted-foreground w-9 text-right">{fmtPct(r.reviewShare)}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {outliers.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {outliers.map((o) => (
            <div
              key={o.key}
              className="flex items-start gap-2 text-xs text-mvr-danger bg-mvr-danger-light rounded-lg px-3 py-2"
            >
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span>{o.assessment}</span>
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
