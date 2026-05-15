// Find the last time the LIVE workflow (not backfill) ingested transactions.
// Live ingests have ingestedAt very close to createdAt; backfill has a huge gap.
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({
  datasources: { db: { url: process.env.RISK_DATABASE_URL } },
})

async function main() {
  // Pull last 50 ingests with the gap between charge time and ingest time.
  const rows = await db.$queryRaw<Array<{
    id: string
    status: string
    created_at: Date
    ingested_at: Date
    delay_minutes: number
  }>>`
    SELECT id, status, created_at, ingested_at,
           EXTRACT(EPOCH FROM (ingested_at - created_at)) / 60.0 AS delay_minutes
    FROM risk_agent.transactions
    ORDER BY ingested_at DESC
    LIMIT 30
  `

  console.log('Last 30 transactions, ordered by ingest time')
  console.log('Column "delay" = minutes between Stripe created_at and our ingested_at.')
  console.log('Small delay (<5 min) = live webhook. Large delay (>>1h) = backfill run.')
  console.log('')
  console.log('ingested_at                created_at                 status     delay        id')
  for (const r of rows) {
    const delay = Number(r.delay_minutes)
    const delayStr = delay < 60 ? `${delay.toFixed(1)}m` : delay < 1440 ? `${(delay / 60).toFixed(1)}h` : `${(delay / 1440).toFixed(1)}d`
    const tag = delay < 10 ? '  LIVE' : ''
    console.log(`  ${r.ingested_at.toISOString()}  ${r.created_at.toISOString()}  ${r.status.padEnd(9)}  ${delayStr.padStart(8)}  ${r.id}${tag}`)
  }

  // Find the truly last "live-feeling" ingest
  const lastLive = await db.$queryRaw<Array<{ ingested_at: Date; id: string; created_at: Date }>>`
    SELECT id, created_at, ingested_at
    FROM risk_agent.transactions
    WHERE ingested_at - created_at < INTERVAL '10 minutes'
    ORDER BY ingested_at DESC
    LIMIT 1
  `
  console.log('\n=== LAST LIVE-INGEST (delay < 10 minutes) ===')
  if (lastLive.length === 0) console.log('  NONE found')
  else console.log(`  ${lastLive[0].ingested_at.toISOString()}  charge=${lastLive[0].id}  charge_created=${lastLive[0].created_at.toISOString()}`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
