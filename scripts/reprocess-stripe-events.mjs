// Scans risk_agent.stripe_events for events whose corresponding row in transactions
// or disputes is missing and re-inserts/upserts them with the corrected, null-safe SQL.
//
// Idempotent — safe to re-run. Designed to fill historical gaps left by the live n8n
// workflow when it had the original null-cast bug + the ch_%-only filter.
//
// Run: node scripts/reprocess-stripe-events.mjs
import { PrismaClient } from '@prisma/client'

// Connect with the risk_agent_writer credential so we can SELECT + INSERT in risk_agent.*.
const url = process.env.RISK_DATABASE_URL
if (!url) {
  console.error('RISK_DATABASE_URL not set')
  process.exit(1)
}

const db = new PrismaClient({ datasourceUrl: url })

function getPath(obj, path) {
  let cur = obj
  for (const k of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = cur[k]
  }
  return cur
}

function strOrNull(v) {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

function intOrNull(v) {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function unixToDate(seconds) {
  if (seconds == null) return null
  const n = Number(seconds)
  if (!Number.isFinite(n)) return null
  return new Date(n * 1000)
}

async function upsertTransaction(obj, type) {
  const isPaymentIntent = type === 'payment_intent.payment_failed'
  const id = strOrNull(obj.id)
  if (!id) return { skipped: 'no-id' }
  if (!isPaymentIntent && !id.startsWith('ch_')) return { skipped: 'not-charge' }
  if (isPaymentIntent && !id.startsWith('pi_')) return { skipped: 'not-pi' }

  const paymentIntent = isPaymentIntent ? id : strOrNull(obj.payment_intent)
  const customerId = strOrNull(obj.customer)
  const bookingId = strOrNull(getPath(obj, ['metadata', 'booking_id']))
  const amount = intOrNull(obj.amount)
  if (amount == null) return { skipped: 'no-amount' }
  const currency = strOrNull(obj.currency) ?? 'usd'
  // Stripe payment_intent statuses (requires_payment_method, requires_action, canceled, processing)
  // don't pass the chk_tx_status check on risk_agent.transactions, which only allows
  // succeeded|failed|refunded. payment_intent.payment_failed events are semantically failures,
  // so normalize them to 'failed' here.
  const rawStatus = strOrNull(obj.status)
  const allowed = new Set(['succeeded', 'failed', 'refunded'])
  let status
  if (isPaymentIntent) {
    status = 'failed'
  } else if (rawStatus && allowed.has(rawStatus)) {
    status = rawStatus
  } else {
    status = 'failed' // safest fallback for any non-charge-style status
  }

  let riskLevel = null
  let riskScore = null
  let outcomeReason = null
  const outcome = getPath(obj, ['outcome'])
  if (outcome && typeof outcome === 'object') {
    riskLevel = strOrNull(outcome.risk_level)
    riskScore = intOrNull(outcome.risk_score)
    outcomeReason = strOrNull(outcome.reason)
  }
  if (isPaymentIntent) {
    const err = getPath(obj, ['last_payment_error'])
    if (err && typeof err === 'object') {
      outcomeReason = strOrNull(err.decline_code) ?? strOrNull(err.code) ?? outcomeReason
    }
  }

  const livemode = obj.livemode === true
  const createdAt = unixToDate(obj.created)
  if (!createdAt) return { skipped: 'no-created' }

  await db.$executeRawUnsafe(
    `INSERT INTO risk_agent.transactions
       (id, payment_intent, customer_id, booking_id, amount_cents, currency, status,
        risk_level, risk_score, outcome_reason, livemode, created_at, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       risk_level = COALESCE(EXCLUDED.risk_level, risk_agent.transactions.risk_level),
       risk_score = COALESCE(EXCLUDED.risk_score, risk_agent.transactions.risk_score),
       outcome_reason = COALESCE(EXCLUDED.outcome_reason, risk_agent.transactions.outcome_reason),
       raw = EXCLUDED.raw`,
    id,
    paymentIntent,
    customerId,
    bookingId,
    amount,
    currency,
    status,
    riskLevel,
    riskScore,
    outcomeReason,
    livemode,
    createdAt,
    JSON.stringify(obj)
  )
  return { ok: true }
}

async function upsertDispute(obj) {
  const id = strOrNull(obj.id)
  if (!id || !id.startsWith('du_')) return { skipped: 'not-dispute' }
  const chargeId = strOrNull(obj.charge)
  const paymentIntent = strOrNull(obj.payment_intent)
  const reason = strOrNull(obj.reason) ?? 'unknown'
  const amount = intOrNull(obj.amount)
  if (amount == null) return { skipped: 'no-amount' }
  const currency = strOrNull(obj.currency) ?? 'usd'
  const status = strOrNull(obj.status) ?? 'unknown'
  const evidenceDueBy = unixToDate(getPath(obj, ['evidence_details', 'due_by']))
  const livemode = obj.livemode === true
  const createdAt = unixToDate(obj.created)
  if (!createdAt) return { skipped: 'no-created' }

  await db.$executeRawUnsafe(
    `INSERT INTO risk_agent.disputes
       (id, charge_id, payment_intent, reason, amount_cents, currency, status,
        evidence_due_by, livemode, created_at, updated_at, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       status = EXCLUDED.status,
       reason = EXCLUDED.reason,
       evidence_due_by = EXCLUDED.evidence_due_by,
       updated_at = NOW(),
       raw = EXCLUDED.raw`,
    id,
    chargeId,
    paymentIntent,
    reason,
    amount,
    currency,
    status,
    evidenceDueBy,
    livemode,
    createdAt,
    JSON.stringify(obj)
  )
  return { ok: true }
}

async function main() {
  console.log('🔎 Scanning risk_agent.stripe_events for gaps...\n')

  const txTypes = ['charge.succeeded', 'charge.failed', 'charge.refunded', 'payment_intent.payment_failed']
  const dispTypes = [
    'charge.dispute.created',
    'charge.dispute.updated',
    'charge.dispute.closed',
    'charge.dispute.funds_withdrawn',
    'charge.dispute.funds_reinstated',
  ]

  const missingTx = await db.$queryRawUnsafe(
    `SELECT e.id AS event_id, e.type, e.raw->'data'->'object' AS obj
     FROM risk_agent.stripe_events e
     LEFT JOIN risk_agent.transactions t
       ON t.id = (e.raw->'data'->'object'->>'id')
     WHERE e.type = ANY($1)
       AND t.id IS NULL
     ORDER BY e.received_at ASC`,
    txTypes
  )

  console.log(`Transaction-side gaps: ${missingTx.length} events`)
  const txStats = { ok: 0, skipped: {} }
  for (const row of missingTx) {
    try {
      const res = await upsertTransaction(row.obj, row.type)
      if (res.ok) txStats.ok++
      else txStats.skipped[res.skipped] = (txStats.skipped[res.skipped] ?? 0) + 1
    } catch (e) {
      console.error(`  ✖ ${row.event_id} (${row.type}):`, e.message ?? e)
    }
  }
  console.log(`  ✅ Upserted: ${txStats.ok}`)
  if (Object.keys(txStats.skipped).length > 0) console.log('  ⚠ Skipped:', txStats.skipped)

  const missingDisp = await db.$queryRawUnsafe(
    `SELECT e.id AS event_id, e.type, e.raw->'data'->'object' AS obj
     FROM risk_agent.stripe_events e
     LEFT JOIN risk_agent.disputes d
       ON d.id = (e.raw->'data'->'object'->>'id')
     WHERE e.type = ANY($1)
       AND d.id IS NULL
     ORDER BY e.received_at ASC`,
    dispTypes
  )

  console.log(`\nDispute-side gaps: ${missingDisp.length} events`)
  const dispStats = { ok: 0, skipped: {} }
  for (const row of missingDisp) {
    try {
      const res = await upsertDispute(row.obj)
      if (res.ok) dispStats.ok++
      else dispStats.skipped[res.skipped] = (dispStats.skipped[res.skipped] ?? 0) + 1
    } catch (e) {
      console.error(`  ✖ ${row.event_id} (${row.type}):`, e.message ?? e)
    }
  }
  console.log(`  ✅ Upserted: ${dispStats.ok}`)
  if (Object.keys(dispStats.skipped).length > 0) console.log('  ⚠ Skipped:', dispStats.skipped)

  console.log('\nDone.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
