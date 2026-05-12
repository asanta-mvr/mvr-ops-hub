import { riskDb } from '@/lib/db/risk'
import type { DisputeFilters } from '@/lib/risk/schemas'

// ── time helpers ───────────────────────────────────────────────────────────
function periodRange(year?: number, month?: number): { gte?: Date; lt?: Date } {
  if (!year) return {}
  if (month) {
    const start = new Date(Date.UTC(year, month - 1, 1))
    const end = new Date(Date.UTC(year, month, 1))
    return { gte: start, lt: end }
  }
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  }
}

function bucketStatus(s: string): 'won' | 'lost' | 'pending' {
  if (s === 'won') return 'won'
  if (s === 'lost') return 'lost'
  return 'pending'
}

function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

// ── disputes tab ───────────────────────────────────────────────────────────
export type RiskSummary = {
  kpis: {
    totalDisputed: number
    totalCount: number
    recovered: number
    recoveredCount: number
    netLoss: number
    lostCount: number
    pending: number
    pendingCount: number
    winRatePct: number | null
    preventableLossPct: number | null
  }
  monthly: Array<{ month: string; won: number; lost: number; pending: number; amountCents: number }>
  outcomes: Array<{ status: 'won' | 'lost' | 'pending'; count: number }>
  reasonsByAmount: Array<{ reason: string; amountCents: number; count: number }>
  reasonsByWinRate: Array<{ reason: string; won: number; lost: number; winRate: number }>
}

export async function getRiskSummary(year?: number, month?: number): Promise<RiskSummary> {
  const range = periodRange(year, month)

  const disputes = await riskDb.riskDispute.findMany({
    where: range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : undefined,
    select: {
      id: true,
      amountCents: true,
      status: true,
      reason: true,
      createdAt: true,
      transaction: { select: { riskLevel: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  let totalDisputed = 0
  let recovered = 0
  let recoveredCount = 0
  let netLoss = 0
  let lostCount = 0
  let pending = 0
  let pendingCount = 0
  let preventableCount = 0
  for (const d of disputes) {
    totalDisputed += d.amountCents
    const b = bucketStatus(d.status)
    if (b === 'won') {
      recovered += d.amountCents
      recoveredCount++
    } else if (b === 'lost') {
      netLoss += d.amountCents
      lostCount++
    } else {
      pending += d.amountCents
      pendingCount++
    }
    const rl = d.transaction?.riskLevel
    if (rl === 'elevated' || rl === 'highest') preventableCount++
  }
  const resolvedCount = recoveredCount + lostCount
  const winRatePct = resolvedCount === 0 ? null : (recoveredCount / resolvedCount) * 100
  const preventableLossPct =
    disputes.length === 0 ? null : (preventableCount / disputes.length) * 100

  const monthlyMap = new Map<
    string,
    { month: string; won: number; lost: number; pending: number; amountCents: number }
  >()
  for (const d of disputes) {
    const key = monthKey(d.createdAt)
    let entry = monthlyMap.get(key)
    if (!entry) {
      entry = { month: key, won: 0, lost: 0, pending: 0, amountCents: 0 }
      monthlyMap.set(key, entry)
    }
    entry.amountCents += d.amountCents
    const b = bucketStatus(d.status)
    entry[b]++
  }
  const monthly = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month))

  const outcomes: RiskSummary['outcomes'] = [
    { status: 'won', count: recoveredCount },
    { status: 'lost', count: lostCount },
    { status: 'pending', count: pendingCount },
  ]

  const reasonMap = new Map<
    string,
    { reason: string; amountCents: number; count: number; won: number; lost: number }
  >()
  for (const d of disputes) {
    let r = reasonMap.get(d.reason)
    if (!r) {
      r = { reason: d.reason, amountCents: 0, count: 0, won: 0, lost: 0 }
      reasonMap.set(d.reason, r)
    }
    r.amountCents += d.amountCents
    r.count++
    if (d.status === 'won') r.won++
    else if (d.status === 'lost') r.lost++
  }

  const reasonsByAmount = Array.from(reasonMap.values())
    .map(({ reason, amountCents, count }) => ({ reason, amountCents, count }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 10)

  const reasonsByWinRate = Array.from(reasonMap.values())
    .filter((r) => r.won + r.lost > 0)
    .map(({ reason, won, lost }) => ({
      reason,
      won,
      lost,
      winRate: (won / (won + lost)) * 100,
    }))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, 10)

  return {
    kpis: {
      totalDisputed,
      totalCount: disputes.length,
      recovered,
      recoveredCount,
      netLoss,
      lostCount,
      pending,
      pendingCount,
      winRatePct,
      preventableLossPct,
    },
    monthly,
    outcomes,
    reasonsByAmount,
    reasonsByWinRate,
  }
}

export async function getRecentDisputes(filters: DisputeFilters) {
  const range = periodRange(filters.year, filters.month)
  return riskDb.riskDispute.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.reason ? { reason: filters.reason } : {}),
      ...(filters.riskLevel ? { transaction: { riskLevel: filters.riskLevel } } : {}),
    },
    include: {
      transaction: {
        select: {
          id: true,
          customerId: true,
          bookingId: true,
          riskLevel: true,
          riskScore: true,
          outcomeReason: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: filters.limit,
    skip: filters.offset,
  })
}

export type IngestFreshness = {
  latestEventAt: Date | null
  latestTransactionAt: Date | null
  latestDisputeUpdateAt: Date | null
  eventsLast24h: number
}

export async function getIngestFreshness(): Promise<IngestFreshness> {
  const [latestEvent, latestTx, latestDisp, recentEvents] = await Promise.all([
    riskDb.stripeEvent.findFirst({ orderBy: { receivedAt: 'desc' }, select: { receivedAt: true } }),
    riskDb.riskTransaction.findFirst({ orderBy: { ingestedAt: 'desc' }, select: { ingestedAt: true } }),
    riskDb.riskDispute.findFirst({ orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    riskDb.stripeEvent.count({
      where: { receivedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    }),
  ])
  return {
    latestEventAt: latestEvent?.receivedAt ?? null,
    latestTransactionAt: latestTx?.ingestedAt ?? null,
    latestDisputeUpdateAt: latestDisp?.updatedAt ?? null,
    eventsLast24h: recentEvents,
  }
}

export async function getAvailableYears(): Promise<number[]> {
  const [oldestDispute, oldestTx] = await Promise.all([
    riskDb.riskDispute.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
    riskDb.riskTransaction.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
  ])
  const dates = [oldestDispute?.createdAt, oldestTx?.createdAt].filter(
    (d): d is Date => d instanceof Date
  )
  if (dates.length === 0) return [new Date().getUTCFullYear()]
  const start = Math.min(...dates.map((d) => d.getUTCFullYear()))
  const end = new Date().getUTCFullYear()
  const years: number[] = []
  for (let y = end; y >= start; y--) years.push(y)
  return years
}

// ── payments tab ───────────────────────────────────────────────────────────
export type PaymentsSummary = {
  kpis: {
    totalCount: number
    totalVolumeCents: number
    succeededCount: number
    succeededVolumeCents: number
    failedCount: number
    failedVolumeCents: number
    refundedCount: number
    refundedVolumeCents: number
    failRatePct: number
    highRiskCount: number
  }
  monthly: Array<{
    month: string
    succeeded: number
    failed: number
    volumeCents: number
    failRatePct: number
  }>
  riskDistribution: Array<{ level: 'normal' | 'elevated' | 'highest'; count: number }>
  declineReasons: Array<{ reason: string; count: number }>
}

export async function getPaymentsSummary(
  year?: number,
  month?: number
): Promise<PaymentsSummary> {
  const range = periodRange(year, month)
  const dateWhere = range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}

  const [txs, refundedAgg] = await Promise.all([
    riskDb.riskTransaction.findMany({
      where: dateWhere,
      select: {
        amountCents: true,
        status: true,
        riskLevel: true,
        outcomeReason: true,
        createdAt: true,
      },
    }),
    riskDb.riskTransaction.aggregate({
      where: { ...dateWhere, raw: { path: ['refunded'], equals: true } },
      _count: { _all: true },
      _sum: { amountCents: true },
    }),
  ])

  let totalCount = 0
  let totalVolumeCents = 0
  let succeededCount = 0
  let succeededVolumeCents = 0
  let failedCount = 0
  let failedVolumeCents = 0
  let highRiskCount = 0

  const monthlyMap = new Map<
    string,
    { month: string; succeeded: number; failed: number; volumeCents: number; failRatePct: number }
  >()
  const riskMap: Record<'normal' | 'elevated' | 'highest', number> = {
    normal: 0,
    elevated: 0,
    highest: 0,
  }
  const reasonMap = new Map<string, number>()

  for (const t of txs) {
    totalCount++
    totalVolumeCents += t.amountCents

    if (t.status === 'succeeded') {
      succeededCount++
      succeededVolumeCents += t.amountCents
    } else if (t.status === 'failed') {
      failedCount++
      failedVolumeCents += t.amountCents
    }

    if (t.riskLevel === 'elevated' || t.riskLevel === 'highest') highRiskCount++
    if (t.riskLevel === 'normal' || t.riskLevel === 'elevated' || t.riskLevel === 'highest') {
      riskMap[t.riskLevel]++
    }

    const key = monthKey(t.createdAt)
    let m = monthlyMap.get(key)
    if (!m) {
      m = { month: key, succeeded: 0, failed: 0, volumeCents: 0, failRatePct: 0 }
      monthlyMap.set(key, m)
    }
    m.volumeCents += t.amountCents
    if (t.status === 'succeeded') m.succeeded++
    else if (t.status === 'failed') m.failed++

    if (t.status === 'failed' && t.outcomeReason) {
      reasonMap.set(t.outcomeReason, (reasonMap.get(t.outcomeReason) ?? 0) + 1)
    }
  }

  const monthly = Array.from(monthlyMap.values())
    .map((m) => {
      const denom = m.succeeded + m.failed
      return { ...m, failRatePct: denom === 0 ? 0 : (m.failed / denom) * 100 }
    })
    .sort((a, b) => a.month.localeCompare(b.month))

  const failRatePct = totalCount === 0 ? 0 : (failedCount / totalCount) * 100

  return {
    kpis: {
      totalCount,
      totalVolumeCents,
      succeededCount,
      succeededVolumeCents,
      failedCount,
      failedVolumeCents,
      refundedCount: refundedAgg._count._all,
      refundedVolumeCents: refundedAgg._sum.amountCents ?? 0,
      failRatePct,
      highRiskCount,
    },
    monthly,
    riskDistribution: [
      { level: 'normal', count: riskMap.normal },
      { level: 'elevated', count: riskMap.elevated },
      { level: 'highest', count: riskMap.highest },
    ],
    declineReasons: Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }
}

// Returns charges with `raw` included so the front can render an expandable detail row.
// If `reasons` is non-empty, filters by outcomeReason IN; otherwise defaults to elevated+highest.
export async function getChargesForTab(filters: {
  year?: number
  month?: number
  reasons?: string[]
  riskLevels?: Array<'normal' | 'elevated' | 'highest'>
  limit?: number
}) {
  const range = periodRange(filters.year, filters.month)
  const limit = Math.min(filters.limit ?? 50, 200)

  const where: Record<string, unknown> = {
    ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
  }
  if (filters.reasons && filters.reasons.length > 0) {
    where.outcomeReason = { in: filters.reasons }
  } else if (filters.riskLevels && filters.riskLevels.length > 0) {
    where.riskLevel = { in: filters.riskLevels }
  } else {
    where.riskLevel = { in: ['elevated', 'highest'] }
  }

  return riskDb.riskTransaction.findMany({
    where,
    select: {
      id: true,
      paymentIntent: true,
      customerId: true,
      bookingId: true,
      amountCents: true,
      currency: true,
      status: true,
      riskLevel: true,
      riskScore: true,
      outcomeReason: true,
      livemode: true,
      createdAt: true,
      raw: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

// Back-compat alias used by existing imports.
export async function getRecentHighRiskCharges(filters: {
  year?: number
  month?: number
  limit?: number
}) {
  return getChargesForTab({
    year: filters.year,
    month: filters.month,
    riskLevels: ['elevated', 'highest'],
    limit: filters.limit ?? 20,
  })
}

// ── refunds tab ────────────────────────────────────────────────────────────
export type RefundsSummary = {
  kpis: {
    totalRefundsCount: number
    totalRefundsAmountCents: number
    pctOfSucceeded: number | null
    avgRefundDays: number | null
  }
  monthly: Array<{ month: string; count: number; amountCents: number }>
  reasons: Array<{ reason: string; count: number; amountCents: number }>
}

type StripeRefund = {
  id?: string
  amount?: number
  reason?: string | null
  created?: number
  status?: string
}

export async function getRefundsSummary(year?: number, month?: number): Promise<RefundsSummary> {
  const range = periodRange(year, month)
  const dateWhere = range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}

  // Only refunded transactions, ordered newest first. raw needed for refunds.data[].
  const [txs, succeededAgg] = await Promise.all([
    riskDb.riskTransaction.findMany({
      where: { ...dateWhere, raw: { path: ['refunded'], equals: true } },
      select: { createdAt: true, raw: true, amountCents: true },
    }),
    riskDb.riskTransaction.aggregate({
      where: { ...dateWhere, status: 'succeeded' },
      _count: { _all: true },
    }),
  ])

  let totalRefundsCount = 0
  let totalRefundsAmountCents = 0
  let avgDaysAccum = 0
  let avgDaysSamples = 0
  const monthlyMap = new Map<string, { month: string; count: number; amountCents: number }>()
  const reasonMap = new Map<string, { reason: string; count: number; amountCents: number }>()

  for (const t of txs) {
    const refunds = readRefundsFromRaw(t.raw)
    if (refunds.length === 0) {
      // The flag is set but no refund subobjects; treat the whole charge as one refund.
      totalRefundsCount++
      totalRefundsAmountCents += t.amountCents
      const key = monthKey(t.createdAt)
      const m = monthlyMap.get(key) ?? { month: key, count: 0, amountCents: 0 }
      m.count++
      m.amountCents += t.amountCents
      monthlyMap.set(key, m)
      const reason = '(unknown)'
      const r = reasonMap.get(reason) ?? { reason, count: 0, amountCents: 0 }
      r.count++
      r.amountCents += t.amountCents
      reasonMap.set(reason, r)
      continue
    }
    for (const refund of refunds) {
      const amt = refund.amount ?? 0
      totalRefundsCount++
      totalRefundsAmountCents += amt

      const createdSec = refund.created ?? t.createdAt.getTime() / 1000
      const refundDate = new Date(createdSec * 1000)
      const days = (refundDate.getTime() - t.createdAt.getTime()) / 86_400_000
      if (Number.isFinite(days) && days >= 0) {
        avgDaysAccum += days
        avgDaysSamples++
      }

      const mk = monthKey(refundDate)
      const m = monthlyMap.get(mk) ?? { month: mk, count: 0, amountCents: 0 }
      m.count++
      m.amountCents += amt
      monthlyMap.set(mk, m)

      const reason = refund.reason ?? '(unknown)'
      const r = reasonMap.get(reason) ?? { reason, count: 0, amountCents: 0 }
      r.count++
      r.amountCents += amt
      reasonMap.set(reason, r)
    }
  }

  const succeededCount = succeededAgg._count._all
  const pctOfSucceeded =
    succeededCount === 0 ? null : (totalRefundsCount / succeededCount) * 100
  const avgRefundDays = avgDaysSamples === 0 ? null : avgDaysAccum / avgDaysSamples

  return {
    kpis: {
      totalRefundsCount,
      totalRefundsAmountCents,
      pctOfSucceeded,
      avgRefundDays,
    },
    monthly: Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    reasons: Array.from(reasonMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
  }
}

function readRefundsFromRaw(raw: unknown): StripeRefund[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const refundsField = (raw as Record<string, unknown>).refunds
  if (!refundsField || typeof refundsField !== 'object' || Array.isArray(refundsField)) return []
  const data = (refundsField as Record<string, unknown>).data
  if (!Array.isArray(data)) return []
  return data as StripeRefund[]
}

export async function getRecentRefunds(filters: {
  year?: number
  month?: number
  reasons?: string[]
  limit?: number
}) {
  const range = periodRange(filters.year, filters.month)
  const limit = Math.min(filters.limit ?? 50, 200)

  const txs = await riskDb.riskTransaction.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      raw: { path: ['refunded'], equals: true },
    },
    select: {
      id: true,
      customerId: true,
      bookingId: true,
      amountCents: true,
      currency: true,
      status: true,
      livemode: true,
      createdAt: true,
      raw: true,
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 2, // some charges may have multiple refunds; we slice later
  })

  // Flatten one row per refund event for display, with the parent charge info.
  const rows: Array<{
    chargeId: string
    refundId: string | null
    refundAmountCents: number
    refundReason: string | null
    refundedAt: Date
    customerId: string | null
    bookingId: string | null
    amountCents: number
    currency: string
    status: string
    livemode: boolean
    chargeCreatedAt: Date
    raw: unknown
  }> = []

  for (const t of txs) {
    const refunds = readRefundsFromRaw(t.raw)
    if (refunds.length === 0) {
      rows.push({
        chargeId: t.id,
        refundId: null,
        refundAmountCents: t.amountCents,
        refundReason: null,
        refundedAt: t.createdAt,
        customerId: t.customerId,
        bookingId: t.bookingId,
        amountCents: t.amountCents,
        currency: t.currency,
        status: t.status,
        livemode: t.livemode,
        chargeCreatedAt: t.createdAt,
        raw: t.raw,
      })
    } else {
      for (const refund of refunds) {
        const refundedAt = new Date((refund.created ?? t.createdAt.getTime() / 1000) * 1000)
        rows.push({
          chargeId: t.id,
          refundId: refund.id ?? null,
          refundAmountCents: refund.amount ?? 0,
          refundReason: refund.reason ?? null,
          refundedAt,
          customerId: t.customerId,
          bookingId: t.bookingId,
          amountCents: t.amountCents,
          currency: t.currency,
          status: t.status,
          livemode: t.livemode,
          chargeCreatedAt: t.createdAt,
          raw: t.raw,
        })
      }
    }
  }

  // If reasons filter applied, drop non-matching rows.
  const filtered = filters.reasons && filters.reasons.length > 0
    ? rows.filter((r) => filters.reasons!.includes(r.refundReason ?? '(unknown)'))
    : rows

  filtered.sort((a, b) => b.refundedAt.getTime() - a.refundedAt.getTime())
  return filtered.slice(0, limit)
}
