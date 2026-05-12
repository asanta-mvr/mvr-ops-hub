// One-off check of risk_agent.* data freshness. Run: node scripts/check-risk-data.mjs
import { PrismaClient } from '../lib/generated/risk-client/index.js'

const db = new PrismaClient()

async function q(label, sql) {
  const r = await db.$queryRawUnsafe(sql)
  console.log(`\n── ${label} ──`)
  console.table(r.map((row) => {
    const out = {}
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.toISOString() : v
    }
    return out
  }))
}

await q('transactions total', `SELECT count(*)::int AS rows FROM risk_agent.transactions`)
await q('disputes total', `SELECT count(*)::int AS rows FROM risk_agent.disputes`)
await q('stripe_events total', `SELECT count(*)::int AS rows FROM risk_agent.stripe_events`)
await q(
  'transactions by year',
  `SELECT EXTRACT(YEAR FROM created_at)::int AS year, count(*)::int AS rows FROM risk_agent.transactions GROUP BY 1 ORDER BY 1 DESC`
)
await q(
  'transactions by month (last 6)',
  `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS month, count(*)::int AS rows, (sum(amount_cents)/100)::int AS usd FROM risk_agent.transactions GROUP BY 1 ORDER BY 1 DESC LIMIT 6`
)
await q(
  'disputes by year',
  `SELECT EXTRACT(YEAR FROM created_at)::int AS year, count(*)::int AS rows FROM risk_agent.disputes GROUP BY 1 ORDER BY 1 DESC`
)
await q('disputes status', `SELECT status, count(*)::int AS rows FROM risk_agent.disputes GROUP BY 1 ORDER BY 2 DESC`)
await q(
  'livemode split',
  `SELECT 'transactions' AS t, livemode, count(*)::int AS rows FROM risk_agent.transactions GROUP BY 2 UNION ALL SELECT 'disputes' AS t, livemode, count(*)::int FROM risk_agent.disputes GROUP BY 2`
)
await q(
  'sample transactions',
  `SELECT id, amount_cents, status, livemode, created_at FROM risk_agent.transactions ORDER BY created_at DESC LIMIT 3`
)
await q(
  'sample disputes',
  `SELECT id, charge_id, reason, status, amount_cents, livemode, created_at FROM risk_agent.disputes ORDER BY created_at DESC LIMIT 3`
)
await q(
  'status distribution',
  `SELECT status, count(*)::int AS rows, (sum(amount_cents)/100)::int AS usd FROM risk_agent.transactions GROUP BY 1 ORDER BY 2 DESC`
)
await q(
  'risk_level distribution',
  `SELECT COALESCE(risk_level, '(null)') AS risk_level, count(*)::int AS rows FROM risk_agent.transactions GROUP BY 1 ORDER BY 2 DESC`
)
await q(
  'outcome_reason distribution',
  `SELECT COALESCE(outcome_reason, '(null)') AS outcome_reason, count(*)::int AS rows FROM risk_agent.transactions GROUP BY 1 ORDER BY 2 DESC LIMIT 10`
)
await q(
  'raw.refunded vs refunded status',
  `SELECT (raw->>'refunded')::bool AS raw_refunded, status, count(*)::int AS rows FROM risk_agent.transactions GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 10`
)
await q(
  'stripe_events types',
  `SELECT type, count(*)::int AS rows FROM risk_agent.stripe_events GROUP BY 1 ORDER BY 2 DESC`
)
await q(
  'freshness — last 24h',
  `SELECT 'stripe_events' AS source, count(*)::int AS rows, max(received_at) AS latest FROM risk_agent.stripe_events WHERE received_at > now() - interval '24 hours'
   UNION ALL
   SELECT 'transactions', count(*)::int, max(ingested_at) FROM risk_agent.transactions WHERE ingested_at > now() - interval '24 hours'
   UNION ALL
   SELECT 'disputes', count(*)::int, max(updated_at) FROM risk_agent.disputes WHERE updated_at > now() - interval '24 hours'`
)
await q(
  'dispute events that should have produced rows',
  `SELECT e.id AS event_id, e.type, e.received_at, e.raw->'data'->'object'->>'id' AS dispute_id, d.id AS row_exists
   FROM risk_agent.stripe_events e
   LEFT JOIN risk_agent.disputes d ON d.id = (e.raw->'data'->'object'->>'id')
   WHERE e.type LIKE 'charge.dispute.%'
   ORDER BY e.received_at DESC`
)
await q(
  'gap analysis — events without a row',
  `SELECT type, count(*)::int AS events_received,
     count(CASE WHEN type LIKE 'charge.%' AND type <> 'charge.dispute.created' AND t.id IS NOT NULL THEN 1 END)::int AS tx_rows,
     count(CASE WHEN type LIKE 'charge.dispute.%' AND d.id IS NOT NULL THEN 1 END)::int AS disp_rows
   FROM risk_agent.stripe_events e
   LEFT JOIN risk_agent.transactions t ON t.id = (e.raw->'data'->'object'->>'id')
   LEFT JOIN risk_agent.disputes d ON d.id = (e.raw->'data'->'object'->>'id')
   GROUP BY type
   ORDER BY events_received DESC`
)

await db.$disconnect()
