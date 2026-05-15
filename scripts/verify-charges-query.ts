// Simulate what getChargesForTab() returns for the chargebacks page (no filter, May 2026).
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'
const db = new RiskClient({ datasources: { db: { url: process.env.RISK_DATABASE_URL } } })

async function main() {
  // No risk filter — should return ALL transactions in May 2026.
  const start = new Date(Date.UTC(2026, 4, 1))
  const end = new Date(Date.UTC(2026, 5, 1))
  const rows = await db.riskTransaction.findMany({
    where: { createdAt: { gte: start, lt: end } },
    select: { id: true, status: true, amountCents: true, riskLevel: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  console.log(`Total returned: ${rows.length}`)

  const byPrefix = new Map<string, number>()
  const byRisk = new Map<string, number>()
  const byStatus = new Map<string, number>()
  for (const r of rows) {
    const prefix = r.id.slice(0, 3)
    byPrefix.set(prefix, (byPrefix.get(prefix) ?? 0) + 1)
    const rl = r.riskLevel ?? '(null)'
    byRisk.set(rl, (byRisk.get(rl) ?? 0) + 1)
    byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1)
  }
  console.log('\nBy id prefix:')
  for (const [k, v] of byPrefix) console.log(`  ${k}  ${v}`)
  console.log('\nBy risk level:')
  for (const [k, v] of byRisk) console.log(`  ${k.padEnd(10)}  ${v}`)
  console.log('\nBy status:')
  for (const [k, v] of byStatus) console.log(`  ${k.padEnd(20)}  ${v}`)

  console.log('\nFirst 5 rows (newest):')
  for (const r of rows.slice(0, 5)) {
    console.log(`  ${r.createdAt.toISOString()}  $${(r.amountCents/100).toFixed(2).padStart(9)}  ${r.status.padEnd(20)}  risk=${(r.riskLevel ?? '-').padEnd(10)}  ${r.id}`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
