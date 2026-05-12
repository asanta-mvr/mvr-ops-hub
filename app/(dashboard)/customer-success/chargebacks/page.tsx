import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  getAvailableYears,
  getChargesForTab,
  getIngestFreshness,
  getPaymentsSummary,
  getRecentDisputes,
  getRecentRefunds,
  getRefundsSummary,
  getRiskSummary,
} from '@/lib/risk/queries'
import { ALLOWED_RISK_ROLES } from '@/lib/risk/schemas'
import { ChargebacksClient } from '@/components/modules/customer-success/chargebacks/ChargebacksClient'
import { FreshnessIndicator } from '@/components/modules/customer-success/chargebacks/FreshnessIndicator'

export const metadata: Metadata = { title: 'Risk & Chargebacks' }

interface PageProps {
  searchParams: { year?: string; month?: string }
}

export default async function ChargebacksPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const year = searchParams.year ? Number(searchParams.year) : undefined
  const month = searchParams.month ? Number(searchParams.month) : undefined

  const [
    summary,
    recentDisputes,
    paymentsSummary,
    highRiskCharges,
    refundsSummary,
    recentRefunds,
    years,
    watchlist,
    freshness,
  ] = await Promise.all([
    getRiskSummary(year, month),
    getRecentDisputes({ year, month, limit: 20, offset: 0 }),
    getPaymentsSummary(year, month),
    getChargesForTab({ year, month, riskLevels: ['elevated', 'highest'], limit: 200 }),
    getRefundsSummary(year, month),
    getRecentRefunds({ year, month, limit: 50 }),
    getAvailableYears(),
    db.notificationWatchlist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    getIngestFreshness(),
  ])

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
        paymentsSummary={paymentsSummary}
        highRiskCharges={highRiskCharges}
        refundsSummary={refundsSummary}
        recentRefunds={recentRefunds}
        years={years}
        initialYear={year}
        initialMonth={month}
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
