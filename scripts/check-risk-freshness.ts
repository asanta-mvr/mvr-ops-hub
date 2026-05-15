// One-shot diagnostic: shows latest activity in the risk_agent schema.
// Run: npx tsx scripts/check-risk-freshness.ts
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({
  datasources: { db: { url: process.env.RISK_DATABASE_URL } },
})

function ago(d: Date | null | undefined): string {
  if (!d) return 'never'
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} d ago`
}

async function main() {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const [
    latestEvent,
    latestTx,
    latestDisp,
    eventsLast24h,
    eventsLast7d,
    txLast24h,
    txLast7d,
    eventTypeBreakdown,
    recentEvents,
    recentTx,
    unprocessedEvents,
  ] = await Promise.all([
    db.stripeEvent.findFirst({ orderBy: { receivedAt: 'desc' } }),
    db.riskTransaction.findFirst({ orderBy: { ingestedAt: 'desc' } }),
    db.riskDispute.findFirst({ orderBy: { updatedAt: 'desc' } }),
    db.stripeEvent.count({ where: { receivedAt: { gte: since24h } } }),
    db.stripeEvent.count({ where: { receivedAt: { gte: since7d } } }),
    db.riskTransaction.count({ where: { ingestedAt: { gte: since24h } } }),
    db.riskTransaction.count({ where: { ingestedAt: { gte: since7d } } }),
    db.$queryRaw<Array<{ type: string; n: bigint }>>`
      SELECT type, COUNT(*)::bigint AS n
      FROM risk_agent.stripe_events
      WHERE received_at > NOW() - INTERVAL '7 days'
      GROUP BY type
      ORDER BY n DESC
      LIMIT 20
    `,
    db.stripeEvent.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 10,
      select: { id: true, type: true, receivedAt: true, processedAt: true },
    }),
    db.riskTransaction.findMany({
      orderBy: { ingestedAt: 'desc' },
      take: 5,
      select: { id: true, amountCents: true, status: true, createdAt: true, ingestedAt: true },
    }),
    db.stripeEvent.count({
      where: { processedAt: null, receivedAt: { gte: since7d } },
    }),
  ])

  console.log('\n=== RISK_AGENT FRESHNESS ===')
  console.log(`Latest stripe_event:     ${latestEvent?.receivedAt?.toISOString() ?? 'NONE'}  (${ago(latestEvent?.receivedAt)})  type=${latestEvent?.type}`)
  console.log(`Latest risk_transaction: ${latestTx?.ingestedAt?.toISOString() ?? 'NONE'}  (${ago(latestTx?.ingestedAt)})  charge.createdAt=${latestTx?.createdAt?.toISOString()}`)
  console.log(`Latest risk_dispute:     ${latestDisp?.updatedAt?.toISOString() ?? 'NONE'}  (${ago(latestDisp?.updatedAt)})`)
  console.log('')
  console.log(`stripe_event count (24h):    ${eventsLast24h}`)
  console.log(`stripe_event count (7d):     ${eventsLast7d}`)
  console.log(`risk_transaction (24h):      ${txLast24h}`)
  console.log(`risk_transaction (7d):       ${txLast7d}`)
  console.log(`unprocessed events (7d):     ${unprocessedEvents}`)

  console.log('\n=== EVENT TYPES (last 7 days) ===')
  for (const r of eventTypeBreakdown) {
    console.log(`  ${String(r.n).padStart(5)}  ${r.type}`)
  }

  console.log('\n=== LAST 10 stripe_event ROWS ===')
  for (const e of recentEvents) {
    const proc = e.processedAt ? `proc=${e.processedAt.toISOString()}` : 'NOT PROCESSED'
    console.log(`  ${e.receivedAt.toISOString()}  ${e.type.padEnd(38)}  ${proc}`)
  }

  console.log('\n=== LAST 5 risk_transaction ROWS ===')
  for (const t of recentTx) {
    console.log(`  ingested=${t.ingestedAt.toISOString()}  charge.created=${t.createdAt.toISOString()}  status=${t.status}  $${(t.amountCents / 100).toFixed(2)}  ${t.id}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
