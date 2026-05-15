import { getRiskByBuilding } from '@/lib/risk/queries'

async function main() {
  console.log('=== getRiskByBuilding(2026) by Risk Level filter ===\n')

  const cases: Array<{ label: string; rls?: Array<'normal'|'elevated'|'highest'> }> = [
    { label: 'no filter (all 3)' },
    { label: 'normal only',          rls: ['normal'] },
    { label: 'elevated only',        rls: ['elevated'] },
    { label: 'highest only',         rls: ['highest'] },
    { label: 'elevated + highest',   rls: ['elevated', 'highest'] },
  ]

  for (const c of cases) {
    const rows = await getRiskByBuilding(2026, undefined, undefined, c.rls)
    console.log(`--- ${c.label} ---`)
    for (const r of rows) {
      console.log(
        `  ${r.building.padEnd(10)}  total=${String(r.total).padStart(5)}  N=${String(r.normal).padStart(5)}  E=${String(r.elevated).padStart(4)}  H=${String(r.highest).padStart(4)}`
      )
    }
    console.log()
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
