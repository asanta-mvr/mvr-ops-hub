'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Gavel, LayoutDashboard, TrendingUp } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type {
  CohortSegmentRow,
  CohortWeekPoint,
  DailyVolumePoint,
  DisputeStats,
  EmergingStrength,
  HeatmapRow,
  PainPointRow,
  ReviewsSummary,
  ReviewWithAction,
  TagDistRow,
  WeeklyResponsePoint,
} from '@/lib/reviews/types'
import { DisputesPanel } from './DisputesPanel'
import { OverviewPanel } from './OverviewPanel'
import { buildPerformanceKpis } from './PerformanceList'
import { PerformancePanel } from './PerformancePanel'
import { ReviewsFilterBar } from './ReviewsFilterBar'

interface TabFilters {
  years:     number[]
  months:    number[]
  buildings: string[]
  units:     string[]
  otas:      OtaSource[]
  stars:     number[]
}

interface PerformanceTabFilters extends TabFilters {
  page:     number
  pageSize: number
}

interface Props {
  // Per-tab applied filters (parsed from each tab's URL prefix).
  overviewFilters:    TabFilters
  performanceFilters: PerformanceTabFilters
  disputesFilters:    TabFilters

  /** Flat (un-prefixed) query string of Overview's applied filters. Threaded
   *  to OverviewPanel so its drill-down API calls (latest, heatmap, cell)
   *  respect the ov_* scope. */
  overviewScopeParams: string

  // Per-tab server-fetched data.
  overviewData: {
    summary:           ReviewsSummary
    heatmap:           HeatmapRow[]
    dailyVolume:       DailyVolumePoint[]
    tagDistribution:   TagDistRow[]
    initialLatestGood: ReviewWithAction[]
    initialLatestBad:  ReviewWithAction[]
    disputeStats:      DisputeStats
  }
  performanceData: {
    rows:             ReviewWithAction[]
    totalCount:       number
    summary:          ReviewsSummary
    weeklyTrend:      CohortWeekPoint[]
    channelSegments:  CohortSegmentRow[]
    buildingSegments: CohortSegmentRow[]
    responseTrend:    WeeklyResponsePoint[]
    strengths:        EmergingStrength[]
    painPoints:       PainPointRow[]
  }
  disputesData: {
    rows:         ReviewWithAction[]
    disputeStats: DisputeStats
  }

  // Shared option lists for every filter bar.
  buildingOptions: string[]
  unitOptions:     string[]
  otaOptions:      OtaSource[]
  yearOptions:     number[]
  /** Distinct (year, month) combos in the data — scopes the month dropdown. */
  yearMonthsOptions: Array<{ year: number; month: number }>
  assigneeOptions: Array<{ id: string; name: string }>
}

export function ReviewsClient({
  overviewFilters,
  performanceFilters,
  disputesFilters,
  overviewScopeParams,
  overviewData,
  performanceData,
  disputesData,
  buildingOptions,
  unitOptions,
  otaOptions,
  yearOptions,
  yearMonthsOptions,
  assigneeOptions,
}: Props) {
  const router = useRouter()
  // Performance and Disputes each fetch their own row set via per-tab URL
  // filters, so we keep two independent client-side stores. patchRow updates
  // both if the same review appears in both filtered slices.
  const [perfRows, setPerfRows]   = useState<ReviewWithAction[]>(performanceData.rows)
  const [dispRows, setDispRows]   = useState<ReviewWithAction[]>(disputesData.rows)
  const [activeTab, setActiveTab] = useState<string>('overview')

  function patchRow(updated: ReviewWithAction) {
    const matches = (r: ReviewWithAction) =>
      r.otaSource === updated.otaSource && r.id === updated.id
    setPerfRows((prev) => prev.map((r) => (matches(r) ? updated : r)))
    setDispRows((prev) => prev.map((r) => (matches(r) ? updated : r)))
    // Light-touch refresh — pulls fresh summary counts on the server.
    router.refresh()
  }

  const perfKpis = buildPerformanceKpis(
    performanceData.totalCount,
    performanceData.summary.avgRating,
    performanceData.summary.responseRate,
  )

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="!flex-col w-full">
        <TabsList variant="line" className="border-b border-[#E0DBD4] w-full justify-start h-12 pb-2">
          <TabsTrigger value="overview" className="px-4 text-sm gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="px-4 text-sm gap-2">
            <TrendingUp className="w-4 h-4" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="disputes" className="px-4 text-sm gap-2">
            <Gavel className="w-4 h-4" />
            Disputes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ReviewsFilterBar
            prefix="ov_"
            years={overviewFilters.years}
            months={overviewFilters.months}
            buildings={overviewFilters.buildings}
            units={overviewFilters.units}
            otas={overviewFilters.otas}
            stars={overviewFilters.stars}
            yearOptions={yearOptions}
            yearMonths={yearMonthsOptions}
            buildingOptions={buildingOptions}
            unitOptions={unitOptions}
            otaOptions={otaOptions}
          />
          <OverviewPanel
            summary={overviewData.summary}
            heatmap={overviewData.heatmap}
            dailyVolume={overviewData.dailyVolume}
            tagDistribution={overviewData.tagDistribution}
            disputeStats={overviewData.disputeStats}
            initialLatestGood={overviewData.initialLatestGood}
            initialLatestBad={overviewData.initialLatestBad}
            scopeParams={overviewScopeParams}
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <ReviewsFilterBar
            prefix="pf_"
            years={performanceFilters.years}
            months={performanceFilters.months}
            buildings={performanceFilters.buildings}
            units={performanceFilters.units}
            otas={performanceFilters.otas}
            stars={performanceFilters.stars}
            yearOptions={yearOptions}
            yearMonths={yearMonthsOptions}
            buildingOptions={buildingOptions}
            unitOptions={unitOptions}
            otaOptions={otaOptions}
          />
          <PerformancePanel
            weeklyTrend={performanceData.weeklyTrend}
            channelSegments={performanceData.channelSegments}
            buildingSegments={performanceData.buildingSegments}
            responseTrend={performanceData.responseTrend}
            strengths={performanceData.strengths}
            painPoints={performanceData.painPoints}
            rows={perfRows}
            totalCount={performanceData.totalCount}
            page={performanceFilters.page}
            pageSize={performanceFilters.pageSize}
            topKpis={perfKpis}
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>

        <TabsContent value="disputes" className="space-y-4">
          <ReviewsFilterBar
            prefix="dp_"
            years={disputesFilters.years}
            months={disputesFilters.months}
            buildings={disputesFilters.buildings}
            units={disputesFilters.units}
            otas={disputesFilters.otas}
            stars={disputesFilters.stars}
            yearOptions={yearOptions}
            yearMonths={yearMonthsOptions}
            buildingOptions={buildingOptions}
            unitOptions={unitOptions}
            otaOptions={otaOptions}
          />
          <DisputesPanel
            rows={dispRows}
            disputeStats={disputesData.disputeStats}
            assigneeOptions={assigneeOptions}
            onActionSaved={patchRow}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
