import { getChargesForTab, getPaymentsSummary } from '@/lib/risk/queries'

async function main() {
  console.log('=== Multi-select smoke test (2026) ===\n')

  const cases = [
    { label: 'no filter',                  buildings: [],              chargeTypes: [],         riskLevels: [] },
    { label: 'Arya only',                  buildings: ['Arya'],        chargeTypes: [],         riskLevels: [] },
    { label: 'Arya + Icon',                buildings: ['Arya','Icon'], chargeTypes: [],         riskLevels: [] },
    { label: 'Arya + Icon + Elser',        buildings: ['Arya','Icon','Elser'], chargeTypes: [], riskLevels: [] },
    { label: 'Arya + Charge type only',    buildings: ['Arya'],        chargeTypes: ['Charge'], riskLevels: [] },
    { label: 'Arya + elevated+highest',    buildings: ['Arya'],        chargeTypes: [],         riskLevels: ['elevated','highest'] },
    { label: 'All buildings + elevated',   buildings: [],              chargeTypes: [],         riskLevels: ['elevated'] },
  ]

  for (const c of cases) {
    const kpi = await getPaymentsSummary(2026, undefined, {
      buildings: c.buildings,
      chargeTypes: c.chargeTypes,
      riskLevels: c.riskLevels as any,
    })
    const charges = await getChargesForTab({
      year: 2026,
      buildings: c.buildings.length > 0 ? c.buildings : undefined,
      chargeTypes: c.chargeTypes.length > 0 ? c.chargeTypes : undefined,
      globalRiskLevels: c.riskLevels.length > 0 ? (c.riskLevels as any) : undefined,
      limit: 500,
    })
    console.log(
      `${c.label.padEnd(35)} → kpi.totalCount=${String(kpi.kpis.totalCount).padStart(5)}  rows=${String(charges.length).padStart(4)}  vol=$${(kpi.kpis.totalVolumeCents/100).toFixed(2)}`
    )
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
