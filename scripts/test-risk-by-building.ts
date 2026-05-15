import { getPaymentsSummary, getRiskByBuilding } from '@/lib/risk/queries'

async function main() {
  console.log('=== Risk by building (2026, all months, no scope filter) ===')
  const rows = await getRiskByBuilding(2026)
  for (const r of rows) {
    const pct = (n: number) => r.total === 0 ? '0%' : `${((n / r.total) * 100).toFixed(1).padStart(5)}%`
    console.log(`  ${r.building.padEnd(12)}  total=${String(r.total).padStart(5)}  N ${pct(r.normal)}  E ${pct(r.elevated)}  H ${pct(r.highest)}`)
  }

  console.log('\n=== Risk Level scope filter (2026) ===')
  for (const rl of [undefined, 'normal', 'elevated', 'highest'] as const) {
    const s = await getPaymentsSummary(2026, undefined, rl ? { riskLevel: rl } : {})
    console.log(`  riskLevel=${(rl ?? 'all').padEnd(10)} → totalCount=${String(s.kpis.totalCount).padStart(5)}  volume=$${(s.kpis.totalVolumeCents / 100).toFixed(2)}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
