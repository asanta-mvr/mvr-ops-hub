// Quick smoke test: call getChargesForTab with each KPI's filter and report counts.
import { getChargesForTab } from '@/lib/risk/queries'

async function main() {
  const cases = [
    { name: 'no filter', args: { year: 2026, month: 5, limit: 500 } },
    { name: 'status=succeeded', args: { year: 2026, month: 5, statuses: ['succeeded'], limit: 500 } },
    { name: 'status=failed', args: { year: 2026, month: 5, statuses: ['failed'], limit: 500 } },
    { name: 'riskLevel=elevated,highest', args: { year: 2026, month: 5, riskLevels: ['elevated' as const, 'highest' as const], limit: 500 } },
  ]
  for (const c of cases) {
    const rows = await getChargesForTab(c.args)
    const byPrefix = new Map<string, number>()
    for (const r of rows) byPrefix.set(r.id.slice(0, 3), (byPrefix.get(r.id.slice(0, 3)) ?? 0) + 1)
    const prefixStr = Array.from(byPrefix).map(([k, v]) => `${k}=${v}`).join(', ')
    console.log(`${c.name.padEnd(35)} → ${rows.length} rows  [${prefixStr}]`)
  }
}
main().catch(e => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
