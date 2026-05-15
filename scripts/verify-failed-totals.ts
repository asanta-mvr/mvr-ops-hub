// Confirm declineReasons now sum to failedCount (KPI ↔ drill-down match).
import { getPaymentsSummary } from '@/lib/risk/queries'

async function main() {
  for (const b of [undefined, 'Arya', 'Elser', 'Icon']) {
    const s = await getPaymentsSummary(2026, 5, b ? { building: b } : {})
    const sumOfReasons = s.declineReasons.reduce((acc, r) => acc + r.count, 0)
    const match = sumOfReasons === s.kpis.failedCount ? 'ok' : 'FAIL'
    console.log(
      `${match}  building=${(b ?? 'all').padEnd(8)}  failedCount=${s.kpis.failedCount}  sumOfReasons=${sumOfReasons}  segments=${s.declineReasons.length}`
    )
    if (s.declineReasons.length > 0) {
      for (const r of s.declineReasons) {
        console.log(`         ${String(r.count).padStart(4)}  ${r.reason}`)
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
