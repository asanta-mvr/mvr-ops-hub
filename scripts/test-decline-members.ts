import { getPaymentsSummary } from '@/lib/risk/queries'

async function main() {
  const s = await getPaymentsSummary(2026, undefined, {})
  console.log(`failedCount: ${s.kpis.failedCount}`)
  for (const r of s.declineReasons) {
    if (r.reason === '(other)' && r.members) {
      console.log(`  ${r.reason}  count=${r.count}  members=[${r.members.join(', ')}]`)
    } else {
      console.log(`  ${r.reason}  count=${r.count}`)
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => process.exit(0))
