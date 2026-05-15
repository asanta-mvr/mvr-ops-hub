import { getChargeTypeByBuilding } from '@/lib/risk/queries'

async function main() {
  console.log('=== getChargeTypeByBuilding(2026) ===\n')

  const cases: Array<{ label: string; types?: string[]; risks?: Array<'normal'|'elevated'|'highest'> }> = [
    { label: 'no filter' },
    { label: 'chargeType=Charge only', types: ['Charge'] },
    { label: 'chargeType=Deposit only', types: ['Deposit'] },
    { label: 'risk=elevated+highest', risks: ['elevated', 'highest'] },
    { label: 'risk=highest + Deposit', types: ['Deposit'], risks: ['highest'] },
  ]

  for (const c of cases) {
    const rows = await getChargeTypeByBuilding(2026, undefined, c.types, c.risks)
    console.log(`--- ${c.label} ---`)
    for (const r of rows) {
      const parts = Object.entries(r.counts)
        .sort((a, b) => b[1] - a[1])
        .map(([t, n]) => `${t}=${n}`)
        .join(', ')
      console.log(`  ${r.building.padEnd(10)}  total=${String(r.total).padStart(5)}  [${parts}]`)
    }
    console.log()
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
