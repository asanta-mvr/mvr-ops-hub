// Sample the metadata.property / metadata['Property Nickname'] values used in
// charges so we can write the right building-prefix parser.
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'
const db = new RiskClient({ datasources: { db: { url: process.env.RISK_DATABASE_URL } } })

async function main() {
  const rows = await db.$queryRaw<Array<{ prop: string; n: bigint }>>`
    SELECT
      COALESCE(
        raw->'metadata'->>'Property Nickname',
        raw->'metadata'->>'property',
        raw->'metadata'->>'Property Name'
      ) AS prop,
      COUNT(*)::bigint AS n
    FROM risk_agent.transactions
    WHERE created_at >= NOW() - INTERVAL '60 days'
    GROUP BY prop
    ORDER BY n DESC
    LIMIT 80
  `
  console.log(`${rows.length} distinct property values in last 60d:`)
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(5)}  ${r.prop ?? '(null)'}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
