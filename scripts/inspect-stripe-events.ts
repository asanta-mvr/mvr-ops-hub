// Inspect recent stripe_events to understand the payload shape n8n is receiving.
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({
  datasources: { db: { url: process.env.RISK_DATABASE_URL } },
})

async function main() {
  const events = await db.stripeEvent.findMany({
    orderBy: { receivedAt: 'desc' },
    take: 5,
    select: { id: true, type: true, receivedAt: true, raw: true },
  })

  for (const e of events) {
    console.log('\n' + '='.repeat(80))
    console.log(`event_id=${e.id}  type=${e.type}  received=${e.receivedAt.toISOString()}`)
    console.log('='.repeat(80))
    const raw = e.raw as unknown
    if (!raw || typeof raw !== 'object') {
      console.log('raw is NOT an object:', typeof raw, JSON.stringify(raw).slice(0, 300))
      continue
    }
    const r = raw as Record<string, unknown>
    console.log('top-level keys:', Object.keys(r).join(', '))
    console.log('raw.id =', r.id)
    console.log('raw.type =', r.type)
    console.log('raw.livemode =', r.livemode)
    const data = r.data as Record<string, unknown> | undefined
    if (!data) {
      console.log('NO data field!  raw preview:', JSON.stringify(raw).slice(0, 400))
      continue
    }
    console.log('data keys:', Object.keys(data).join(', '))
    const obj = data.object as Record<string, unknown> | undefined
    if (!obj) {
      console.log('NO data.object field!  data preview:', JSON.stringify(data).slice(0, 400))
      continue
    }
    console.log('data.object.id =', obj.id)
    console.log('data.object.amount =', obj.amount)
    console.log('data.object.status =', obj.status)
    console.log('data.object.payment_intent =', obj.payment_intent)
    console.log('data.object.customer =', obj.customer)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
