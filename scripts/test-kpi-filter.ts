import { getChargesForTab, getChargeTypeByBuilding, getPaymentsSummary } from '@/lib/risk/queries'

async function main() {
  console.log('=== KPI-as-URL-filter smoke test (2026) ===\n')

  // 1) KPI strip (unfiltered) — should always show overview
  const kpis = await getPaymentsSummary(2026, undefined, {})
  console.log(`KPI strip (overview):`)
  console.log(`  total=${kpis.kpis.totalCount}  succeeded=${kpis.kpis.succeededCount}  failed=${kpis.kpis.failedCount}  highRisk=${kpis.kpis.highRiskCount}\n`)

  // 2) Click "Failed" → status=failed for charts/table
  console.log('--- after clicking "Failed" (status=failed) ---')
  const failedRows = await getChargesForTab({ year: 2026, statuses: ['failed'], limit: 500 })
  const failedChart = await getChargeTypeByBuilding(2026, undefined, undefined, undefined, ['failed'])
  console.log(`  table rows: ${failedRows.length}`)
  console.log(`  charge-type chart:`)
  for (const r of failedChart) {
    console.log(`    ${r.building.padEnd(10)} total=${r.total}`)
  }

  // 3) Click "Succeeded"
  console.log('\n--- after clicking "Succeeded" (status=succeeded) ---')
  const succRows = await getChargesForTab({ year: 2026, statuses: ['succeeded'], limit: 500 })
  const succChart = await getChargeTypeByBuilding(2026, undefined, undefined, undefined, ['succeeded'])
  console.log(`  table rows (limit 500): ${succRows.length}`)
  console.log(`  charge-type chart:`)
  for (const r of succChart) {
    console.log(`    ${r.building.padEnd(10)} total=${r.total}`)
  }

  // 4) Click "High risk" → riskLevel=elevated,highest
  console.log('\n--- after clicking "High risk" (riskLevel=elevated,highest) ---')
  const hrChart = await getChargeTypeByBuilding(2026, undefined, undefined, ['elevated', 'highest'], undefined)
  for (const r of hrChart) {
    console.log(`    ${r.building.padEnd(10)} total=${r.total}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
