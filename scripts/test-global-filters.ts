// Smoke-test the new global filters end-to-end.
import {
  getAvailableBuildings,
  getAvailableChargeTypes,
  getChargesForTab,
  getPaymentsSummary,
} from '@/lib/risk/queries'

async function main() {
  console.log('=== Available filters for May 2026 ===')
  const buildings = await getAvailableBuildings(2026, 5)
  console.log('Buildings:', buildings.join(', '))
  const chargeTypes = await getAvailableChargeTypes(2026, 5)
  console.log('Charge types:', chargeTypes.slice(0, 10).join(', '), chargeTypes.length > 10 ? `(+${chargeTypes.length - 10} more)` : '')

  console.log('\n=== getChargesForTab counts ===')
  const all = await getChargesForTab({ year: 2026, month: 5, limit: 500 })
  console.log(`  no filter             → ${all.length} rows`)

  if (buildings.includes('Icon')) {
    const icon = await getChargesForTab({ year: 2026, month: 5, building: 'Icon', limit: 500 })
    console.log(`  building=Icon         → ${icon.length} rows`)
  }
  if (buildings.includes('Arya')) {
    const arya = await getChargesForTab({ year: 2026, month: 5, building: 'Arya', limit: 500 })
    console.log(`  building=Arya         → ${arya.length} rows`)
  }

  console.log('\n=== getPaymentsSummary KPIs ===')
  const allKpi = await getPaymentsSummary(2026, 5)
  console.log(`  no filter   → totalCount=${allKpi.kpis.totalCount}  totalVolume=$${(allKpi.kpis.totalVolumeCents / 100).toFixed(2)}`)
  if (buildings.includes('Icon')) {
    const iconKpi = await getPaymentsSummary(2026, 5, { building: 'Icon' })
    console.log(`  Icon        → totalCount=${iconKpi.kpis.totalCount}  totalVolume=$${(iconKpi.kpis.totalVolumeCents / 100).toFixed(2)}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
