import { getPaymentsSummary } from '@/lib/risk/queries'
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({ datasources: { db: { url: process.env.RISK_DATABASE_URL } } })

async function main() {
  // 1) Through the query helper
  const s = await getPaymentsSummary(2026, undefined, {})
  const sumOfReasons = s.declineReasons.reduce((a, r) => a + r.count, 0)
  console.log('=== via getPaymentsSummary(2026) ===')
  console.log('failedCount (KPI):     ', s.kpis.failedCount)
  console.log('sum of declineReasons: ', sumOfReasons)
  console.log('delta:                 ', s.kpis.failedCount - sumOfReasons)
  console.log('segments:', s.declineReasons.length)
  for (const r of s.declineReasons) console.log('   ', String(r.count).padStart(5), r.reason)

  // 2) Raw count for sanity
  console.log('\n=== raw counts for 2026 ===')
  const totalFailed = await db.riskTransaction.count({
    where: { status: 'failed', createdAt: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } },
  })
  console.log('total failed:                   ', totalFailed)
  const failedWithReason = await db.riskTransaction.count({
    where: {
      status: 'failed',
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') },
      outcomeReason: { not: null },
    },
  })
  console.log('failed WITH outcomeReason:      ', failedWithReason)
  const failedWithoutReason = await db.riskTransaction.count({
    where: {
      status: 'failed',
      createdAt: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') },
      outcomeReason: null,
    },
  })
  console.log('failed WITHOUT outcomeReason:   ', failedWithoutReason)

  // 3) Distinct reasons present
  const grouped = await db.riskTransaction.groupBy({
    by: ['outcomeReason'],
    where: { status: 'failed', createdAt: { gte: new Date('2026-01-01'), lt: new Date('2027-01-01') } },
    _count: { _all: true },
    orderBy: { _count: { outcomeReason: 'desc' } },
  })
  console.log('\nDistinct outcomeReason buckets (all):')
  for (const g of grouped) {
    console.log(`   ${String(g._count._all).padStart(5)}  ${g.outcomeReason ?? '(NULL)'}`)
  }
  console.log('Total distinct reasons (incl. NULL):', grouped.length)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
