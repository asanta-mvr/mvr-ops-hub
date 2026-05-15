// Verify building aliases: parser + SQL filter expansion behave correctly.
import { extractBuilding, canonicalBuilding, buildingSources } from '@/lib/risk/building'
import { getAvailableBuildings, getChargesForTab, getPaymentsSummary } from '@/lib/risk/queries'

async function main() {
  console.log('=== Parser canonicalization ===')
  const parserCases: Array<[string, string | null]> = [
    ['Arya 1708-1', 'Arya'],
    ['Arya PO 1405-1', 'Arya'],
    ['PO 1405-1', 'Arya'],
    ['Elser 2213', 'Elser'],
    ['Elser Studios 2202', 'Elser'],
    ['Icon 3901', 'Icon'],
    ['Natiivo 1234', 'Natiivo'],
    ['District 5A', 'District'],
  ]
  for (const [input, expected] of parserCases) {
    const got = extractBuilding(input)
    const ok = got === expected
    console.log(`  ${ok ? 'ok' : 'FAIL'}  ${input.padEnd(28)} → ${got}  (expected ${expected})`)
  }

  console.log('\n=== Sources for canonical buildings ===')
  for (const c of ['Arya', 'Elser', 'Icon']) {
    console.log(`  ${c.padEnd(8)} → [${buildingSources(c).join(', ')}]`)
  }

  console.log('\n=== Dropdown options (May 2026) ===')
  const buildings = await getAvailableBuildings(2026, 5)
  console.log(`  ${buildings.join(', ')}`)

  console.log('\n=== Filtered counts (May 2026) ===')
  const all = await getChargesForTab({ year: 2026, month: 5, limit: 500 })
  console.log(`  no filter        → ${all.length} rows`)
  const arya = await getChargesForTab({ year: 2026, month: 5, building: 'Arya', limit: 500 })
  console.log(`  building=Arya    → ${arya.length} rows`)
  const elser = await getChargesForTab({ year: 2026, month: 5, building: 'Elser', limit: 500 })
  console.log(`  building=Elser   → ${elser.length} rows`)
  const icon = await getChargesForTab({ year: 2026, month: 5, building: 'Icon', limit: 500 })
  console.log(`  building=Icon    → ${icon.length} rows`)

  console.log('\n=== KPIs by canonical building (May 2026) ===')
  for (const b of ['Arya', 'Elser', 'Icon']) {
    const kpi = await getPaymentsSummary(2026, 5, { building: b })
    console.log(`  ${b.padEnd(8)} → totalCount=${kpi.kpis.totalCount}  volume=$${(kpi.kpis.totalVolumeCents / 100).toFixed(2)}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
