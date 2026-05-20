'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  DailyVolumePoint,
  DisputeStats,
  HeatmapRow,
  ReviewsSummary,
  ReviewWithAction,
  TagDistRow,
} from '@/lib/reviews/types'
import { BuildingBreakdown } from './BuildingBreakdown'
import { CellDetailPanel, type SelectedCell } from './CellDetailPanel'
import { ChannelBreakdown } from './ChannelBreakdown'
import { DailyVolumeChart } from './DailyVolumeChart'
import { KpiStrip, fiveStarTone, type KpiCard } from './KpiStrip'
import { LatestReviewsSplit } from './LatestReviewsSplit'
import { MetricHeatmap } from './MetricHeatmap'
import { RatingDistributionBar } from './RatingDistributionBar'
import { TagTreemap } from './TagTreemap'

interface Props {
  summary:           ReviewsSummary
  heatmap:           HeatmapRow[]
  dailyVolume:       DailyVolumePoint[]
  tagDistribution:   TagDistRow[]
  disputeStats:      DisputeStats
  initialLatestGood: ReviewWithAction[]
  initialLatestBad:  ReviewWithAction[]
  /** Flat (un-prefixed) query string of Overview's applied URL filters —
   *  e.g. "year=2026&building=Arya,Icon&stars=4,5". Used as the base of
   *  every drill-down API call (latest, heatmap, cell) so they respect the
   *  ov_ tab scope without picking up the pf_ or dp_ keys from
   *  window.location. */
  scopeParams:       string
  assigneeOptions:   Array<{ id: string; name: string }>
  onActionSaved?:    (row: ReviewWithAction) => void
}

function fmtPct(v: number | null): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(1)}%`
}

export function OverviewPanel({
  summary,
  heatmap,
  dailyVolume,
  tagDistribution,
  disputeStats,
  initialLatestGood,
  initialLatestBad,
  scopeParams,
  assigneeOptions,
  onActionSaved,
}: Props) {
  // Treemap → Latest reviews cross-filter state. Clicking a positive tile
  // narrows the "Latest good" column; same for negative → "Latest bad".
  const [selectedPositive, setSelectedPositive] = useState<string | null>(null)
  const [selectedNegative, setSelectedNegative] = useState<string | null>(null)

  // Heatmap → Review Detail cross-filter state. Clicking a cell drills into
  // its underlying reviews in the panel directly below.
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null)

  // Per-column total fetch size — drives a refetch when the user picks a
  // different value in the dropdown footer.
  const [goodLimit, setGoodLimit] = useState<number>(5)
  const [badLimit,  setBadLimit]  = useState<number>(5)

  const [latestGood, setLatestGood] = useState<ReviewWithAction[]>(initialLatestGood)
  const [latestBad,  setLatestBad]  = useState<ReviewWithAction[]>(initialLatestBad)
  const [loadingGood, setLoadingGood] = useState(false)
  const [loadingBad,  setLoadingBad]  = useState(false)

  // Re-sync when the server re-renders the page (filter change above).
  useEffect(() => { setLatestGood(initialLatestGood) }, [initialLatestGood])
  useEffect(() => { setLatestBad(initialLatestBad)  }, [initialLatestBad])

  // Fetch latest whenever tag selection OR fetch limit changes. We carry the
  // current searchParams through so the year/OTA/building filters keep applying.
  const goodReqRef = useRef(0)
  const badReqRef  = useRef(0)

  useEffect(() => {
    if (selectedPositive == null && goodLimit === 5) {
      setLatestGood(initialLatestGood); setLoadingGood(false); return
    }
    const reqId = ++goodReqRef.current
    setLoadingGood(true)
    const qs = new URLSearchParams(scopeParams)
    qs.set('bucket', 'good')
    if (selectedPositive) qs.set('tag', selectedPositive)
    qs.set('limit', String(goodLimit))
    fetch(`/api/v1/reviews/latest?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (reqId !== goodReqRef.current) return // stale response
        if (json.error) setLatestGood([])
        else setLatestGood((json.data as ReviewWithAction[]) ?? [])
      })
      .catch(() => { if (reqId === goodReqRef.current) setLatestGood([]) })
      .finally(() => { if (reqId === goodReqRef.current) setLoadingGood(false) })
  }, [selectedPositive, goodLimit, initialLatestGood, scopeParams])

  useEffect(() => {
    if (selectedNegative == null && badLimit === 5) {
      setLatestBad(initialLatestBad); setLoadingBad(false); return
    }
    const reqId = ++badReqRef.current
    setLoadingBad(true)
    const qs = new URLSearchParams(scopeParams)
    qs.set('bucket', 'bad')
    if (selectedNegative) qs.set('tag', selectedNegative)
    qs.set('limit', String(badLimit))
    fetch(`/api/v1/reviews/latest?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (reqId !== badReqRef.current) return
        if (json.error) setLatestBad([])
        else setLatestBad((json.data as ReviewWithAction[]) ?? [])
      })
      .catch(() => { if (reqId === badReqRef.current) setLatestBad([]) })
      .finally(() => { if (reqId === badReqRef.current) setLoadingBad(false) })
  }, [selectedNegative, badLimit, initialLatestBad, scopeParams])

  const cards: KpiCard[] = [
    { label: 'Total reviews', value: summary.totalReviews.toLocaleString() },
    {
      label:   'Avg rating',
      value:   summary.avgRating != null ? summary.avgRating.toFixed(2) : '—',
      starred: true,
    },
    {
      label: '5 ★ rate',
      value: fmtPct(summary.fiveStarRate),
      hint:  'target ≥ 90%',
      tone:  fiveStarTone(summary.fiveStarRate),
    },
    {
      label: 'Response rate',
      value: fmtPct(summary.responseRate),
      tone:  fiveStarTone(summary.responseRate),
    },
    {
      label: '% disputed',
      value: fmtPct(disputeStats.disputedPct),
      hint:  'reviews ever sent through pipeline',
    },
    {
      label: 'Dispute win rate',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ChannelBreakdown byOta={summary.byOta} />
        <RatingDistributionBar buckets={summary.ratingBuckets} />
        <BuildingBreakdown byBuilding={summary.byBuilding} />
      </div>

      <MetricHeatmap
        initialData={heatmap}
        initialRowDim="building"
        initialColDim="week"
        selectedCell={selectedCell}
        onSelectCell={setSelectedCell}
        scopeParams={scopeParams}
      />

      <DailyVolumeChart data={dailyVolume} />

      <TagTreemap
        rows={tagDistribution}
        selectedPositive={selectedPositive}
        selectedNegative={selectedNegative}
        onSelectPositive={setSelectedPositive}
        onSelectNegative={setSelectedNegative}
      />

      <LatestReviewsSplit
        goodRows={latestGood}
        badRows={latestBad}
        positiveTagFilter={selectedPositive}
        negativeTagFilter={selectedNegative}
        loadingGood={loadingGood}
        loadingBad={loadingBad}
        goodLimit={goodLimit}
        badLimit={badLimit}
        onChangeGoodLimit={setGoodLimit}
        onChangeBadLimit={setBadLimit}
        assigneeOptions={assigneeOptions}
        onActionSaved={onActionSaved}
      />

      <CellDetailPanel
        selectedCell={selectedCell}
        onClear={() => setSelectedCell(null)}
        scopeParams={scopeParams}
        assigneeOptions={assigneeOptions}
        onActionSaved={onActionSaved}
      />
    </div>
  )
}
