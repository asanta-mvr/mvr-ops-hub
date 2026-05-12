'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PaymentsSummary, RefundsSummary, RiskSummary } from '@/lib/risk/queries'
import { PeriodFilterBar } from './PeriodFilterBar'
import { PaymentsKpiStrip } from './PaymentsKpiStrip'
import { MonthlyVolumeChart } from './MonthlyVolumeChart'
import { RiskDistributionDonut } from './RiskDistributionDonut'
import { ClickableDeclineReasons } from './ClickableDeclineReasons'
import { ExpandableChargesTable, type ExpandableCharge } from './ExpandableChargesTable'
import { useChargesQuery } from './use-charges-query'
import { RefundsKpiStrip } from './RefundsKpiStrip'
import { RefundsMonthlyChart } from './RefundsMonthlyChart'
import { RefundReasonsBars } from './RefundReasonsBars'
import { RefundsTable, type RefundRow } from './RefundsTable'
import { RiskKpiStrip } from './RiskKpiStrip'
import { MonthlyTrendChart } from './MonthlyTrendChart'
import { OutcomesDonut } from './OutcomesDonut'
import { TopReasonsByAmount } from './TopReasonsByAmount'
import { ReasonWinRateBars } from './ReasonWinRateBars'
import { RecentDisputesTable, type RecentDispute } from './RecentDisputesTable'
import { WatchlistPanel, type WatchlistRow } from './WatchlistPanel'

interface Props {
  summary: RiskSummary
  recentDisputes: RecentDispute[]
  paymentsSummary: PaymentsSummary
  highRiskCharges: ExpandableCharge[]
  refundsSummary: RefundsSummary
  recentRefunds: RefundRow[]
  years: number[]
  initialYear?: number
  initialMonth?: number
  watchlist: WatchlistRow[]
}

export function ChargebacksClient({
  summary,
  recentDisputes,
  paymentsSummary,
  highRiskCharges,
  refundsSummary,
  recentRefunds,
  years,
  initialYear,
  initialMonth,
  watchlist,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState('payments')
  const [selectedDeclineReasons, setSelectedDeclineReasons] = useState<string[]>([])
  const [selectedRefundReasons, setSelectedRefundReasons] = useState<string[]>([])
  const [chargesChannel, setChargesChannel] = useState('')

  const chargesQuery = useChargesQuery({
    initial: highRiskCharges,
    selectedReasons: selectedDeclineReasons,
    year: initialYear,
    month: initialMonth,
  })

  function setFilter(key: 'year' | 'month', value: string) {
    const params = new URLSearchParams()
    if (initialYear) params.set('year', String(initialYear))
    if (initialMonth) params.set('month', String(initialMonth))
    if (value) params.set(key, value)
    else params.delete(key)
    if (key === 'year' && !value) params.delete('month')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  function clearFilters() {
    startTransition(() => router.push(pathname))
  }

  const hasFilter = initialYear !== undefined || initialMonth !== undefined

  const filter = (
    <PeriodFilterBar
      years={years}
      year={initialYear}
      month={initialMonth}
      isPending={isPending}
      hasFilter={hasFilter}
      onYearChange={(v) => setFilter('year', v)}
      onMonthChange={(v) => setFilter('month', v)}
      onClear={clearFilters}
    />
  )

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => setActiveTab(v as string)}
      className="!flex-col w-full"
    >
      <TabsList variant="line" className="border-b border-[#E0DBD4] w-full justify-start">
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="refunds">Refunds</TabsTrigger>
        <TabsTrigger value="disputes">Disputes</TabsTrigger>
      </TabsList>

      {/* ── PAYMENTS ─────────────────────────────────────────────────────── */}
      <TabsContent value="payments" className="space-y-5 pt-2">
        {filter}

        <PaymentsKpiStrip kpis={paymentsSummary.kpis} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Monthly
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">
              Volume + Fail rate
            </h3>
            <MonthlyVolumeChart data={paymentsSummary.monthly} />
          </div>
          <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Risk
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">Distribution</h3>
            <RiskDistributionDonut data={paymentsSummary.riskDistribution} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Drill down
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-3">
            Top reasons for failed charges
          </h3>
          <ClickableDeclineReasons
            data={paymentsSummary.declineReasons}
            selected={selectedDeclineReasons}
            onChange={setSelectedDeclineReasons}
          />
        </div>

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Watchlist
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-1">Charges to review</h3>
          <p className="text-xs text-muted-foreground mb-3">
            One row per case. Repeat attempts from the same guest (name + card last 4) are grouped with a
            <span className="inline-block mx-1 px-1 rounded bg-mvr-danger-light text-mvr-danger border border-mvr-danger/30 text-[10px] font-semibold">×N</span>
            badge — expand to see every attempt and notify CX in one click.
          </p>
          <ExpandableChargesTable
            charges={chargesQuery.charges}
            loading={chargesQuery.loading}
            error={chargesQuery.error}
            selectedReasons={selectedDeclineReasons}
            channel={chargesChannel}
            onChannelChange={setChargesChannel}
          />
        </div>

        <WatchlistPanel initial={watchlist} />
      </TabsContent>

      {/* ── REFUNDS ──────────────────────────────────────────────────────── */}
      <TabsContent value="refunds" className="space-y-5 pt-2">
        {filter}

        <RefundsKpiStrip kpis={refundsSummary.kpis} />

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Monthly
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-3">
            Refunds count + amount
          </h3>
          <RefundsMonthlyChart data={refundsSummary.monthly} />
        </div>

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Drill down
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-3">
            Top reasons for refunds
          </h3>
          <RefundReasonsBars
            data={refundsSummary.reasons}
            selected={selectedRefundReasons}
            onChange={setSelectedRefundReasons}
          />
        </div>

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Refunds
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-3">Refund ledger</h3>
          <RefundsTable
            initial={recentRefunds}
            selectedReasons={selectedRefundReasons}
            year={initialYear}
            month={initialMonth}
          />
        </div>
      </TabsContent>

      {/* ── DISPUTES ─────────────────────────────────────────────────────── */}
      <TabsContent value="disputes" className="space-y-5 pt-2">
        {filter}

        <RiskKpiStrip kpis={summary.kpis} />

        {summary.kpis.preventableLossPct !== null && (
          <div className="bg-mvr-warning-light border border-mvr-warning/30 rounded-xl px-5 py-3 text-xs text-mvr-warning">
            <strong className="font-semibold">{summary.kpis.preventableLossPct.toFixed(0)}%</strong> of disputes came from charges that were
            flagged as elevated or highest risk at payment time. Acting on those flags upstream
            (Payments tab) is the cheapest way to lower this number.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Monthly
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">
              Disputes &amp; amount, by outcome
            </h3>
            <MonthlyTrendChart data={summary.monthly} />
          </div>
          <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Distribution
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">Outcomes</h3>
            <OutcomesDonut data={summary.outcomes} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Exposure
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">Top reasons by amount</h3>
            <TopReasonsByAmount data={summary.reasonsByAmount} />
          </div>
          <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
              Win rate
            </div>
            <h3 className="font-display text-lg text-mvr-primary mb-3">Where we win</h3>
            <ReasonWinRateBars data={summary.reasonsByWinRate} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5">
          <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-1">
            Live
          </div>
          <h3 className="font-display text-lg text-mvr-primary mb-3">Recent disputes</h3>
          <RecentDisputesTable disputes={recentDisputes} />
        </div>
      </TabsContent>
    </Tabs>
  )
}
