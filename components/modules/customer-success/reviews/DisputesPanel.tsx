'use client'

import type { DisputeStats, ReviewActionStatus, ReviewWithAction } from '@/lib/reviews/types'
import { KpiStrip, type KpiCard } from './KpiStrip'
import { PerformanceList } from './PerformanceList'

interface Props {
  rows:            ReviewWithAction[]
  disputeStats:    DisputeStats
  assigneeOptions: Array<{ id: string; name: string }>
  onActionSaved?:  (row: ReviewWithAction) => void
}

const DISPUTE_STATUSES: ReadonlyArray<ReviewActionStatus> = [
  'disputing', 'dispute_won', 'dispute_lost', 'closed_no_change',
]

function fmtPct(v: number | null): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

export function DisputesPanel({ rows, disputeStats, assigneeOptions, onActionSaved }: Props) {
  const filtered = rows.filter((r) => r.action && DISPUTE_STATUSES.includes(r.action.status))

  const cards: KpiCard[] = [
    { label: 'Disputing now', value: disputeStats.disputingNow.toLocaleString() },
    { label: 'Won YTD',       value: disputeStats.wonYtd.toLocaleString(),  tone: 'success' },
    { label: 'Lost YTD',      value: disputeStats.lostYtd.toLocaleString(), tone: 'danger' },
    {
      label: 'Win rate',
      value: fmtPct(disputeStats.winRate),
      hint:  disputeStats.winRate == null ? 'no closed disputes yet' : 'won ÷ (won + lost)',
      tone:
        disputeStats.winRate == null
          ? 'default'
          : disputeStats.winRate >= 0.5
            ? 'success'
            : disputeStats.winRate >= 0.25
              ? 'warning'
              : 'danger',
    },
  ]

  return (
    <div className="space-y-4">
      <KpiStrip cards={cards} />
      <PerformanceList
        rows={filtered}
        totalCount={filtered.length}
        page={0}
        pageSize={filtered.length || 1}
        assigneeOptions={assigneeOptions}
        onActionSaved={onActionSaved}
        emptyLabel="No disputes yet — nothing to track."
      />
    </div>
  )
}
