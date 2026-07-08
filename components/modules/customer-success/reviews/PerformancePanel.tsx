'use client'

import type {
  CohortSegmentRow,
  CohortWeekPoint,
  EmergingStrength,
  PainPointRow,
  ReviewWithAction,
  WeeklyResponsePoint,
} from '@/lib/reviews/types'
import { EmergingStrengths } from './EmergingStrengths'
import type { KpiCard } from './KpiStrip'
import { PainPoints } from './PainPoints'
import { PerformanceList } from './PerformanceList'
import { SegmentPerformance } from './SegmentPerformance'
import { WeeklyPulse } from './WeeklyPulse'

interface Props {
  // Analytics (PDF pages 2–5)
  weeklyTrend:      CohortWeekPoint[]
  channelSegments:  CohortSegmentRow[]
  buildingSegments: CohortSegmentRow[]
  responseTrend:    WeeklyResponsePoint[]
  strengths:        EmergingStrength[]
  painPoints:       PainPointRow[]

  // Embedded review-triage list (the pre-existing Performance list, retained
  // so per-review actions stay available beneath the analytics).
  rows:            ReviewWithAction[]
  totalCount:      number
  page:            number
  pageSize:        number
  topKpis:         KpiCard[]
  assigneeOptions: Array<{ id: string; name: string }>
  onActionSaved?:  (row: ReviewWithAction) => void
}

export function PerformancePanel({
  weeklyTrend,
  channelSegments,
  buildingSegments,
  responseTrend,
  strengths,
  painPoints,
  rows,
  totalCount,
  page,
  pageSize,
  topKpis,
  assigneeOptions,
  onActionSaved,
}: Props) {
  return (
    <div className="space-y-4">
      <WeeklyPulse weeklyTrend={weeklyTrend} responseTrend={responseTrend} />

      <SegmentPerformance channelSegments={channelSegments} buildingSegments={buildingSegments} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmergingStrengths strengths={strengths} />
        <PainPoints painPoints={painPoints} />
      </div>

      {/* Raw review list + per-review triage actions, kept beneath the analytics. */}
      <div>
        <h3 className="text-sm font-semibold text-mvr-primary mb-2 mt-2">All reviews</h3>
        <PerformanceList
          rows={rows}
          totalCount={totalCount}
          page={page}
          pageSize={pageSize}
          topKpis={topKpis}
          paramPrefix="pf_"
          assigneeOptions={assigneeOptions}
          onActionSaved={onActionSaved}
        />
      </div>
    </div>
  )
}
