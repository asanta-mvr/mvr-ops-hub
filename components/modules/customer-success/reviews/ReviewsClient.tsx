'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { OtaSource } from '@prisma/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  DailyVolumePoint,
  DisputeStats,
  HeatmapRow,
  ReviewsSummary,
  ReviewWithAction,
  TagDistRow,
} from '@/lib/reviews/types'
import { DisputesPanel } from './DisputesPanel'
import { OverviewPanel } from './OverviewPanel'
import { PerformanceList, buildPerformanceKpis } from './PerformanceList'
import { ReviewsFilterBar } from './ReviewsFilterBar'

interface Props {
  initialRows:       ReviewWithAction[]
  initialLatestGood: ReviewWithAction[]
  initialLatestBad:  ReviewWithAction[]
  totalCount:        number
  summary:           ReviewsSummary
  heatmap:           HeatmapRow[]
  dailyVolume:       DailyVolumePoint[]
  tagDistribution:   TagDistRow[]
  disputeStats:      DisputeStats
  buildingOptions:   string[]
  unitOptions:       string[]
  otaOptions:        OtaSource[]
  yearOptions:       number[]
  assigneeOptions:   Array<{ id: string; name: string }>
  initialFilters: {
    years:       number[]
    buildings:   string[]
    units:       string[]
    otas:        OtaSource[]
    stars:       number[]
    unitSearch?: string
    page:        number
    pageSize:    number
  }
}

export function ReviewsClient({
  initialRows,
  initialLatestGood,
  initialLatestBad,
  totalCount,
  summary,
  heatmap,
  dailyVolume,
  tagDistribution,
  disputeStats,
  buildingOptions,
  unitOptions,
  otaOptions,
  yearOptions,
  assigneeOptions,
  initialFilters,
}: Props) {
  const router = useRouter()
  const [rows, setRows]           = useState<ReviewWithAction[]>(initialRows)
  const [activeTab, setActiveTab] = useState<string>('overview')

  function patchRow(updated: ReviewWithAction) {
    setRows((prev) =>
      prev.map((r) =>
        r.otaSource === updated.otaSource && r.id === updated.id ? updated : r
      )
    )
    // Light-touch refresh — pulls fresh summary counts on the server.
    router.refresh()
  }

  const perfKpis = buildPerformanceKpis(totalCount, summary.avgRating, summary.responseRate)

  return (
    <div className="space-y-4">
      <ReviewsFilterBar
        years={initialFilters.years}
        buildings={initialFilters.buildings}
        units={initialFilters.units}
        otas={initialFilters.otas}
        stars={initialFilters.stars}
        unitSearch={initialFilters.unitSearch}
        yearOptions={yearOptions}
        buildingOptions={buildingOptions}
        unitOptions={unitOptions}
        otaOptions={otaOptions}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="!flex-col w-full">
        <TabsList variant="line" className="border-b border-[#E0DBD4] w-full justify-start h-10">
          <TabsTrigger value="overview" className="px-4 text-sm">Overview</TabsTrigger>
          <TabsTrigger value="performance" className="px-4 text-sm">Performance</TabsTrigger>
          <TabsTrigger value="disputes" className="px-4 text-sm">Disputes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewPanel
            summary={summary}
            heatmap={heatmap}
            dailyVolume={dailyVolume}
            tagDistribution={tagDistribution}
            disputeStats={disputeStats}
            initialLatestGood={initialLatestGood}
            initialLatestBad={initialLatestBad}
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceList
            rows={rows}
            totalCount={totalCount}
            page={initialFilters.page}
            pageSize={initialFilters.pageSize}
            topKpis={perfKpis}
            showQuickFilters
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>

        <TabsContent value="disputes">
          <DisputesPanel
            rows={rows}
            disputeStats={disputeStats}
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
