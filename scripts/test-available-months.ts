import { getAvailableMonths } from '@/lib/risk/queries'

async function main() {
  for (const y of [2024, 2025, 2026, 2099]) {
    const months = await getAvailableMonths(y)
    console.log(`${y}: ${months.length ? months.join(', ') : '(none)'}`)
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
