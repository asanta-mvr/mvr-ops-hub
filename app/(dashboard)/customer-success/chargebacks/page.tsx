import type { Metadata } from 'next'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getAvailableBuildings,
  getAvailableChargeTypes,
  getAvailableMonths,
  getAvailableYears,
  getChargeTypeByBuilding,
  getChargesForTab,
  getIngestFreshness,
  getPaymentsSummary,
  getRecentDisputes,
  getRecentRefunds,
  getRefundsSummary,
  getRiskSummary,
  type RiskLevelFilter,
} from '@/lib/risk/queries'
import { requireView } from '@/lib/auth/permissions'
import { ChargebacksClient } from '@/components/modules/customer-success/chargebacks/ChargebacksClient'
import { FreshnessIndicator } from '@/components/modules/customer-success/chargebacks/FreshnessIndicator'

export const metadata: Metadata = { title: 'Risk & Chargebacks' }

// Page reads live risk_agent data — must not be cached at the route level.
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: {
    year?: string
    month?: string
    building?: string
    chargeType?: string
    riskLevel?: string
    /** Transaction status filter, e.g. 'succeeded' or 'failed'. Set by KPI clicks. */
    status?: string
  }
}

const ALLOWED_RISK = new Set<RiskLevelFilter>(['normal', 'elevated', 'highest'])

function splitCsv(v: string | undefined): string[] {
  if (!v) return []
  return v
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

export default async function ChargebacksPage({ searchParams }: PageProps) {
  const session = await auth()
  await requireView(session, 'customer_success.chargebacks', '/no-access')

  const year = searchParams.year ? Number(searchParams.year) : undefined
  const month = searchParams.month ? Number(searchParams.month) : undefined
  const buildings = splitCsv(searchParams.building)
  const chargeTypes = splitCsv(searchParams.chargeType)
  const riskLevels = splitCsv(searchParams.riskLevel).filter(
    (r): r is RiskLevelFilter => ALLOWED_RISK.has(r as RiskLevelFilter)
  )
  const statuses = splitCsv(searchParams.status)
  const globals = { buildings, chargeTypes, riskLevels, statuses }

  // KPI strip stays unfiltered by `statuses` so users always see overview
  // counts (clicking a card filters everything below, not itself). The
  // monthly chart, charge-type-by-building chart, and table do honor the
  // status filter.
  const kpiGlobals = { buildings, chargeTypes, riskLevels } // no statuses
  const needsSeparateChart = statuses.length > 0 || month !== undefined

  const [
    summary,
    recentDisputes,
    paymentsKpiSummary,
    paymentsForChart,
    highRiskCharges,
    refundsSummary,
    recentRefunds,
    chargeTypeByBuilding,
    years,
    buildingOptions,
    chargeTypeOptions,
    availableMonths,
    watchlist,
    freshness,
  ] = await Promise.all([
    getRiskSummary(year, month, globals),
    getRecentDisputes({ year, month, limit: 20, offset: 0 }, globals),
    // KPI cards + decline reasons — unfiltered by `statuses`.
    getPaymentsSummary(year, month, kpiGlobals),
    // Monthly chart — always full-year, and status-filtered if applicable.
    needsSeparateChart
      ? getPaymentsSummary(year, undefined, globals)
      : Promise.resolve(null),
    getChargesForTab({
      year,
      month,
      limit: 500,
      buildings,
      chargeTypes,
      globalRiskLevels: riskLevels,
      statuses,
    }),
    getRefundsSummary(year, month, globals),
    getRecentRefunds({
      year,
      month,
      limit: 50,
      buildings,
      chargeTypes,
      riskLevels,
    }),
    // Per-building charge-type breakdown — honors chargeTypes + riskLevels +
    // statuses but intentionally ignores `buildings` so the chart stays a
    // cross-building comparison.
    getChargeTypeByBuilding(year, month, chargeTypes, riskLevels, statuses),
    getAvailableYears(),
    getAvailableBuildings(year),
    getAvailableChargeTypes(year),
    // Months dropdown is constrained to months with data for the selected
    // year. When no year is set, the dropdown is disabled in the UI so an
    // empty list is fine.
    year ? getAvailableMonths(year) : Promise.resolve<number[]>([]),
    db.notificationWatchlist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    getIngestFreshness(),
  ])
  const monthlyForChart = (paymentsForChart ?? paymentsKpiSummary).monthly

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-mvr-primary">Payments &amp; Risk</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Live Stripe payments, refunds and chargeback visibility — fed by n8n into the{' '}
            <code className="text-xs">risk_agent</code> schema.
          </p>
          <div className="mt-2">
            <FreshnessIndicator freshness={freshness} />
          </div>
        </div>
        <Link
          href="/customer-success/chargebacks/rules"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-mvr-primary border border-[#E0DBD4] hover:bg-mvr-cream transition-colors"
        >
          <Settings className="w-4 h-4" />
          Alert Rules
        </Link>
      </div>

      <ChargebacksClient
        summary={summary}
        recentDisputes={recentDisputes}
        paymentsSummary={paymentsKpiSummary}
        monthlyForChart={monthlyForChart}
        chargeTypeByBuilding={chargeTypeByBuilding}
        highRiskCharges={highRiskCharges}
        refundsSummary={refundsSummary}
        recentRefunds={recentRefunds}
        years={years}
        availableMonths={availableMonths}
        buildingOptions={buildingOptions}
        chargeTypeOptions={chargeTypeOptions}
        initialYear={year}
        initialMonth={month}
        initialBuildings={buildings}
        initialChargeTypes={chargeTypes}
        initialRiskLevels={riskLevels}
        initialStatuses={statuses}
        watchlist={watchlist.map((w) => ({
          id: w.id,
          email: w.email,
          cardLast4: w.cardLast4,
          lossUsd: w.lossUsd ? Number(w.lossUsd) : null,
          reason: w.reason,
          createdAt: w.createdAt.toISOString(),
          createdByName: w.createdBy.name ?? w.createdBy.email,
        }))}
      />
    </div>
  )
}
