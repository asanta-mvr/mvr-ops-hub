// Show all transactions with created_at >= 2026-05-07, grouped by status, plus
// a sample of recent rows. Confirms catch-up data is in the DB.
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'
const db = new RiskClient({ datasources: { db: { url: process.env.RISK_DATABASE_URL } } })

async function main() {
  const rows = await db.$queryRaw<Array<{ d: string; status: string; n: bigint; id_prefix: string }>>`
    SELECT
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d,
      status,
      SUBSTRING(id FROM 1 FOR 3) AS id_prefix,
      COUNT(*)::bigint AS n
    FROM risk_agent.transactions
    WHERE created_at >= '2026-05-07'::timestamptz
    GROUP BY d, status, id_prefix
    ORDER BY d DESC, status, id_prefix
  `
  console.log('Transactions by day x status x id_prefix (since 2026-05-07):')
  console.log(`${'day'.padEnd(12)} ${'status'.padEnd(20)} prefix  count`)
  for (const r of rows) {
    console.log(`${r.d.padEnd(12)} ${r.status.padEnd(20)} ${r.id_prefix.padEnd(7)} ${r.n}`)
  }

  console.log('\n\nSample of 10 newest charge.succeeded rows since 2026-05-07:')
  const sample = await db.$queryRaw<Array<{ id: string; created_at: Date; ingested_at: Date; amount_cents: number; risk_level: string | null }>>`
    SELECT id, created_at, ingested_at, amount_cents, risk_level
    FROM risk_agent.transactions
    WHERE created_at >= '2026-05-07'::timestamptz
      AND status = 'succeeded'
    ORDER BY created_at DESC
    LIMIT 10
  `
  for (const r of sample) {
    console.log(`  ${r.created_at.toISOString()}  $${(r.amount_cents/100).toFixed(2).padStart(9)}  risk=${r.risk_level ?? '-'}  ${r.id}`)
  }

  console.log('\n\nTotal by month (last 90 days):')
  const monthly = await db.$queryRaw<Array<{ m: string; n: bigint; sum_cents: bigint }>>`
    SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS m,
           COUNT(*)::bigint AS n,
           SUM(amount_cents)::bigint AS sum_cents
    FROM risk_agent.transactions
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY m ORDER BY m DESC
  `
  for (const r of monthly) {
    console.log(`  ${r.m}: ${String(r.n).padStart(6)} txs  $${(Number(r.sum_cents)/100).toFixed(2)}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
