import { riskDb } from '@/lib/db/risk'
import { buildingSources, extractBuilding } from '@/lib/risk/building'
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

// ── global filters (building / chargeType / riskLevel) ────────────────────
// These flow from the page's URL params down to every query so the whole
// dashboard reflects the same scope. All three accept arrays for multi-select.
export type RiskLevelFilter = 'normal' | 'elevated' | 'highest'
export type GlobalFilters = {
  buildings?: string[]
  chargeTypes?: string[]
  riskLevels?: RiskLevelFilter[]
  /** Transaction status filter (e.g. ['succeeded'], ['failed']). Powered by
   *  KPI card clicks plus any other future status filter. */
  statuses?: string[]
}

// riskLevel is a top-level column on RiskTransaction; this is the shared
// `where` fragment that callers spread into their query.
function txRiskLevelWhere(globals: GlobalFilters): Record<string, unknown> {
  if (!globals.riskLevels || globals.riskLevels.length === 0) return {}
  if (globals.riskLevels.length === 1) return { riskLevel: globals.riskLevels[0] }
  return { riskLevel: { in: globals.riskLevels } }
}

// status is also a top-level column on RiskTransaction.
function txStatusWhere(globals: GlobalFilters): Record<string, unknown> {
  if (!globals.statuses || globals.statuses.length === 0) return {}
  if (globals.statuses.length === 1) return { status: globals.statuses[0] }
  return { status: { in: globals.statuses } }
}

// Build Prisma `AND` conditions that filter risk_transaction.raw by metadata.
// Property and chargeType live under various keys, so we OR across them. With
// multi-select, "match ANY selected building" is one OR clause and "match ANY
// selected chargeType" is another.
function txMetadataConditions(filters: GlobalFilters): unknown[] {
  const out: unknown[] = []

  const buildings = (filters.buildings ?? []).map((b) => b.trim()).filter(Boolean)
  if (buildings.length > 0) {
    // Each canonical building expands to its known prefix variants (aliases).
    // Combined OR matches any selected building × any of its source prefixes
    // × any of the three property metadata keys.
    const keys = ['Property Nickname', 'property', 'Property Name'] as const
    const subClauses: unknown[] = []
    for (const canonical of buildings) {
      for (const source of buildingSources(canonical)) {
        for (const key of keys) {
          subClauses.push({
            raw: { path: ['metadata', key], string_starts_with: source },
          })
        }
      }
    }
    out.push({ OR: subClauses })
  }

  const chargeTypes = (filters.chargeTypes ?? []).map((t) => t.trim()).filter(Boolean)
  if (chargeTypes.length > 0) {
    const keys = ['Charge Type', 'charge_type', 'type'] as const
    const subClauses: unknown[] = []
    for (const t of chargeTypes) {
      for (const key of keys) {
        subClauses.push({ raw: { path: ['metadata', key], equals: t } })
      }
    }
    out.push({ OR: subClauses })
  }

  return out
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

export async function getRiskSummary(
  year?: number,
  month?: number,
  globals: GlobalFilters = {}
): Promise<RiskSummary> {
  const range = periodRange(year, month)
  const txConds = txMetadataConditions(globals)
  const txClause: Record<string, unknown> = { ...txRiskLevelWhere(globals) }
  if (txConds.length > 0) txClause.AND = txConds as never

  const disputes = await riskDb.riskDispute.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      ...(Object.keys(txClause).length > 0 ? { transaction: txClause } : {}),
    },
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

export async function getRecentDisputes(
  filters: DisputeFilters,
  globals: GlobalFilters = {}
) {
  const range = periodRange(filters.year, filters.month)
  const txConds = txMetadataConditions(globals)
  // Combine risk-level (filter or global) + metadata under one transaction clause.
  // Per-call `filters.riskLevel` (DisputeFilters takes a single one) overrides
  // the global multi-select when present.
  const txClause: Record<string, unknown> = {}
  if (filters.riskLevel) {
    txClause.riskLevel = filters.riskLevel
  } else {
    Object.assign(txClause, txRiskLevelWhere(globals))
  }
  if (txConds.length > 0) txClause.AND = txConds as never
  return riskDb.riskDispute.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.reason ? { reason: filters.reason } : {}),
      ...(Object.keys(txClause).length > 0 ? { transaction: txClause } : {}),
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

// Per-building charge-type breakdown. Honors `chargeTypes` and `riskLevels`
// so the chart reflects the active scope, but intentionally ignores
// `buildings` so the chart always serves as a cross-building comparison
// (filtering to one building would collapse it to a single bar). Buildings
// with zero matching transactions are omitted.
export type ChargeTypeByBuildingRow = {
  building: string
  /** Count keyed by raw charge type label (e.g. "Charge", "Deposit"). NULL
   *  metadata values are bucketed under "(unknown)". */
  counts: Record<string, number>
  total: number
}

export async function getChargeTypeByBuilding(
  year?: number,
  month?: number,
  chargeTypes?: string[],
  riskLevels?: RiskLevelFilter[],
  statuses?: string[]
): Promise<ChargeTypeByBuildingRow[]> {
  const range = periodRange(year, month)
  const txConds = txMetadataConditions({ chargeTypes })

  const txs = await riskDb.riskTransaction.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      ...txRiskLevelWhere({ riskLevels }),
      ...txStatusWhere({ statuses }),
      ...(txConds.length > 0 ? { AND: txConds as never } : {}),
    },
    select: { raw: true },
  })

  const map = new Map<string, ChargeTypeByBuildingRow>()
  for (const t of txs) {
    const raw = t.raw as Record<string, unknown> | null
    const metadata = (raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw.metadata as Record<string, unknown> | undefined)
      : undefined) ?? {}
    const property =
      (typeof metadata['Property Nickname'] === 'string' ? metadata['Property Nickname'] : null) ??
      (typeof metadata['property'] === 'string' ? metadata['property'] : null) ??
      (typeof metadata['Property Name'] === 'string' ? metadata['Property Name'] : null)
    const building = extractBuilding(property)
    if (!building) continue

    const chargeType =
      (typeof metadata['Charge Type'] === 'string' && metadata['Charge Type'].trim() !== ''
        ? (metadata['Charge Type'] as string).trim()
        : null) ??
      (typeof metadata['charge_type'] === 'string' && metadata['charge_type'].trim() !== ''
        ? (metadata['charge_type'] as string).trim()
        : null) ??
      (typeof metadata['type'] === 'string' && metadata['type'].trim() !== ''
        ? (metadata['type'] as string).trim()
        : null) ??
      '(unknown)'

    let row = map.get(building)
    if (!row) {
      row = { building, counts: {}, total: 0 }
      map.set(building, row)
    }
    row.counts[chargeType] = (row.counts[chargeType] ?? 0) + 1
    row.total++
  }
  return Array.from(map.values())
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

export async function getAvailableBuildings(
  year?: number,
  month?: number
): Promise<string[]> {
  const range = periodRange(year, month)
  type Row = { prop: string | null }
  // COALESCE the three known property keys; DISTINCT in SQL, parse + dedupe in JS.
  const rows: Row[] = range.gte
    ? await riskDb.$queryRaw<Row[]>`
        SELECT DISTINCT COALESCE(
          raw->'metadata'->>'Property Nickname',
          raw->'metadata'->>'property',
          raw->'metadata'->>'Property Name'
        ) AS prop
        FROM risk_agent.transactions
        WHERE created_at >= ${range.gte} AND created_at < ${range.lt}
      `
    : await riskDb.$queryRaw<Row[]>`
        SELECT DISTINCT COALESCE(
          raw->'metadata'->>'Property Nickname',
          raw->'metadata'->>'property',
          raw->'metadata'->>'Property Name'
        ) AS prop
        FROM risk_agent.transactions
        WHERE created_at >= NOW() - INTERVAL '180 days'
      `
  const set = new Set<string>()
  for (const r of rows) {
    const b = extractBuilding(r.prop)
    if (b) set.add(b)
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b))
}

export async function getAvailableChargeTypes(
  year?: number,
  month?: number
): Promise<string[]> {
  const range = periodRange(year, month)
  type Row = { kind: string | null }
  const rows: Row[] = range.gte
    ? await riskDb.$queryRaw<Row[]>`
        SELECT DISTINCT COALESCE(
          raw->'metadata'->>'Charge Type',
          raw->'metadata'->>'charge_type',
          raw->'metadata'->>'type'
        ) AS kind
        FROM risk_agent.transactions
        WHERE created_at >= ${range.gte} AND created_at < ${range.lt}
      `
    : await riskDb.$queryRaw<Row[]>`
        SELECT DISTINCT COALESCE(
          raw->'metadata'->>'Charge Type',
          raw->'metadata'->>'charge_type',
          raw->'metadata'->>'type'
        ) AS kind
        FROM risk_agent.transactions
        WHERE created_at >= NOW() - INTERVAL '180 days'
      `
  return rows
    .map((r) => r.kind?.trim())
    .filter((v): v is string => Boolean(v && v.length > 0))
    .sort((a, b) => a.localeCompare(b))
}

// Months (1-12) with at least one transaction in the given year. Used to
// constrain the Month scope dropdown so users can't pick empty periods.
export async function getAvailableMonths(year: number): Promise<number[]> {
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))
  const rows = await riskDb.$queryRaw<Array<{ m: number }>>`
    SELECT DISTINCT EXTRACT(MONTH FROM created_at AT TIME ZONE 'UTC')::int AS m
    FROM risk_agent.transactions
    WHERE created_at >= ${start} AND created_at < ${end}
    ORDER BY m
  `
  return rows
    .map((r) => Number(r.m))
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 12)
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
  declineReasons: Array<{
    reason: string
    count: number
    /** For the synthetic '(other)' bucket, the list of underlying reason codes
     *  it aggregates. Used by the UI to expand the bucket into individual
     *  filter values when the user clicks it. */
    members?: string[]
  }>
}

export async function getPaymentsSummary(
  year?: number,
  month?: number,
  globals: GlobalFilters = {}
): Promise<PaymentsSummary> {
  const range = periodRange(year, month)
  const dateWhere: Record<string, unknown> = range.gte
    ? { createdAt: { gte: range.gte, lt: range.lt } }
    : {}
  const txConds = txMetadataConditions(globals)
  const baseWhere: Record<string, unknown> = {
    ...dateWhere,
    ...txRiskLevelWhere(globals),
    ...txStatusWhere(globals),
    ...(txConds.length > 0 ? { AND: txConds as never } : {}),
  }

  const [txs, refundedAgg] = await Promise.all([
    riskDb.riskTransaction.findMany({
      where: baseWhere,
      select: {
        amountCents: true,
        status: true,
        riskLevel: true,
        outcomeReason: true,
        createdAt: true,
      },
    }),
    riskDb.riskTransaction.aggregate({
      where: {
        ...baseWhere,
        raw: { path: ['refunded'], equals: true },
      },
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

    // Bucket every failed charge so totals match `failedCount`: missing reasons
    // (typically payment_intent.payment_failed events) go to "(unknown)".
    if (t.status === 'failed') {
      const key = t.outcomeReason && t.outcomeReason.trim() !== ''
        ? t.outcomeReason
        : '(unknown)'
      reasonMap.set(key, (reasonMap.get(key) ?? 0) + 1)
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
    declineReasons: collapseDeclineReasons(
      Array.from(reasonMap.entries()).map(([reason, count]) => ({ reason, count }))
    ),
  }
}

// Returns the top reasons by count, collapsing the long tail into "(other)" so
// the segments always sum to `failedCount`. Empty list stays empty.
function collapseDeclineReasons(
  reasons: Array<{ reason: string; count: number }>
): Array<{ reason: string; count: number; members?: string[] }> {
  const TOP = 8
  const sorted = [...reasons].sort((a, b) => b.count - a.count)
  if (sorted.length <= TOP) return sorted
  const head = sorted.slice(0, TOP - 1) // leave the last slot for the tail bucket
  const tail = sorted.slice(TOP - 1)
  const otherCount = tail.reduce((s, r) => s + r.count, 0)
  if (otherCount === 0) return head
  return [
    ...head,
    {
      reason: '(other)',
      count: otherCount,
      members: tail.map((r) => r.reason).filter((r) => r !== '(unknown)'),
    },
  ]
}

// Returns charges with `raw` included so the front can render an expandable detail row.
// If `reasons` is non-empty, filters by outcomeReason IN; otherwise defaults to elevated+highest.
export async function getChargesForTab(filters: {
  year?: number
  month?: number
  reasons?: string[]
  /** Used for the local KPI/click filter; overrides `globalRiskLevels` when set. */
  riskLevels?: Array<'normal' | 'elevated' | 'highest'>
  /** Risk levels from the global scope filter (multi-select). */
  globalRiskLevels?: RiskLevelFilter[]
  statuses?: string[]
  limit?: number
  buildings?: string[]
  chargeTypes?: string[]
}) {
  const range = periodRange(filters.year, filters.month)
  const limit = Math.min(filters.limit ?? 50, 500)
  const txConds = txMetadataConditions({
    buildings: filters.buildings,
    chargeTypes: filters.chargeTypes,
  })

  // All filters compose with AND. When none is provided we return ALL transactions
  // (including risk_level NULL rows from payment_intent.payment_failed events).
  const where: Record<string, unknown> = {
    ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
    ...(txConds.length > 0 ? { AND: txConds as never } : {}),
  }
  if (filters.reasons && filters.reasons.length > 0) {
    where.outcomeReason = { in: filters.reasons }
  }
  // Local riskLevels (KPI click) take precedence over the global ones.
  if (filters.riskLevels && filters.riskLevels.length > 0) {
    where.riskLevel = { in: filters.riskLevels }
  } else if (filters.globalRiskLevels && filters.globalRiskLevels.length > 0) {
    where.riskLevel =
      filters.globalRiskLevels.length === 1
        ? filters.globalRiskLevels[0]
        : { in: filters.globalRiskLevels }
  }
  if (filters.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses }
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

export async function getRefundsSummary(
  year?: number,
  month?: number,
  globals: GlobalFilters = {}
): Promise<RefundsSummary> {
  const range = periodRange(year, month)
  const dateWhere: Record<string, unknown> = range.gte
    ? { createdAt: { gte: range.gte, lt: range.lt } }
    : {}
  const txConds = txMetadataConditions(globals)
  const baseWhere: Record<string, unknown> = {
    ...dateWhere,
    ...txRiskLevelWhere(globals),
    ...txStatusWhere(globals),
    ...(txConds.length > 0 ? { AND: txConds as never } : {}),
  }

  // Only refunded transactions, ordered newest first. raw needed for refunds.data[].
  const [txs, succeededAgg] = await Promise.all([
    riskDb.riskTransaction.findMany({
      where: { ...baseWhere, raw: { path: ['refunded'], equals: true } },
      select: { createdAt: true, raw: true, amountCents: true },
    }),
    riskDb.riskTransaction.aggregate({
      where: { ...baseWhere, status: 'succeeded' },
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
  buildings?: string[]
  chargeTypes?: string[]
  riskLevels?: RiskLevelFilter[]
}) {
  const range = periodRange(filters.year, filters.month)
  const limit = Math.min(filters.limit ?? 50, 200)
  const txConds = txMetadataConditions({
    buildings: filters.buildings,
    chargeTypes: filters.chargeTypes,
  })
  const riskWhere = txRiskLevelWhere({ riskLevels: filters.riskLevels })

  const txs = await riskDb.riskTransaction.findMany({
    where: {
      ...(range.gte ? { createdAt: { gte: range.gte, lt: range.lt } } : {}),
      ...riskWhere,
      ...(txConds.length > 0 ? { AND: txConds as never } : {}),
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
