// One-shot catch-up: replay all stripe_events from the past N days that have no
// corresponding transactions/disputes row. Uses the same upsert pattern as the
// fixed n8n workflow, but executed directly via SQL — no webhook re-fire needed.
//
// SAFE: ON CONFLICT (id) DO UPDATE makes this idempotent.
// SILENT: no Slack notifications (the workflow's Slack branches are skipped).
//
// Run: npx tsx --env-file=.env.local scripts/catchup-stuck-events.ts [--apply]
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({ datasources: { db: { url: process.env.RISK_DATABASE_URL } } })
const APPLY = process.argv.includes('--apply')
const SINCE = process.env.CATCHUP_SINCE ?? '2026-05-07'

async function main() {
  console.log(`Catch-up window: events since ${SINCE}`)
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY RUN'}\n`)

  // Pre-flight: how many events of each relevant type are buffered
  const counts = await db.$queryRaw<Array<{ type: string; n: bigint }>>`
    SELECT type, COUNT(*)::bigint AS n
    FROM risk_agent.stripe_events
    WHERE received_at > ${SINCE}::timestamptz
    GROUP BY type
    ORDER BY n DESC
  `
  console.log('Events in window by type:')
  for (const r of counts) console.log(`  ${String(r.n).padStart(5)}  ${r.type}`)

  // Charges + Payment Intents (per user policy: store everything Stripe sends).
  //   charge.succeeded, charge.failed, charge.refunded, charge.captured, charge.updated
  //   payment_intent.payment_failed (data.object = payment_intent with id = pi_*)
  //
  // For PI events the structure is different from charges. We adapt by reading
  // amount from PI.amount and using the PI's status. risk fields are absent.
  // DISTINCT ON keeps the latest event per charge (Stripe emits succeeded then
  // refunded for the same charge id, which would violate ON CONFLICT in a single
  // statement). ORDER BY id ASC, received_at DESC picks the newest row per id.
  const chargeSQL = `
    INSERT INTO risk_agent.transactions
      (id, payment_intent, customer_id, booking_id, amount_cents, currency, status,
       risk_level, risk_score, outcome_reason, livemode, created_at, raw)
    SELECT DISTINCT ON (raw->'data'->'object'->>'id')
      raw->'data'->'object'->>'id',
      raw->'data'->'object'->>'payment_intent',
      raw->'data'->'object'->>'customer',
      raw->'data'->'object'->'metadata'->>'booking_id',
      NULLIF(raw->'data'->'object'->>'amount','')::int,
      raw->'data'->'object'->>'currency',
      CASE
        WHEN type = 'charge.refunded' THEN
          CASE
            WHEN NULLIF(raw->'data'->'object'->>'amount_refunded','')::int > 0
             AND NULLIF(raw->'data'->'object'->>'amount_refunded','')::int < NULLIF(raw->'data'->'object'->>'amount','')::int
            THEN 'partially_refunded'
            ELSE 'refunded'
          END
        ELSE raw->'data'->'object'->>'status'
      END,
      raw->'data'->'object'->'outcome'->>'risk_level',
      NULLIF(raw->'data'->'object'->'outcome'->>'risk_score','')::int,
      raw->'data'->'object'->'outcome'->>'reason',
      COALESCE((raw->>'livemode')::boolean, false),
      to_timestamp(NULLIF(raw->'data'->'object'->>'created','')::float),
      raw->'data'->'object'
    FROM risk_agent.stripe_events
    WHERE received_at > $1::timestamptz
      AND type IN ('charge.succeeded','charge.failed','charge.refunded','charge.captured','charge.updated')
      AND raw->'data'->'object'->>'id' LIKE 'ch_%'
    ORDER BY raw->'data'->'object'->>'id', received_at DESC
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      raw = EXCLUDED.raw
  `

  // payment_intent.payment_failed events: id starts with pi_, no risk fields.
  // Mirror what the backfill workflow inserts for these (status='failed').
  const piSQL = `
    INSERT INTO risk_agent.transactions
      (id, payment_intent, customer_id, booking_id, amount_cents, currency, status,
       risk_level, risk_score, outcome_reason, livemode, created_at, raw)
    SELECT DISTINCT ON (raw->'data'->'object'->>'id')
      raw->'data'->'object'->>'id',
      raw->'data'->'object'->>'id',
      raw->'data'->'object'->>'customer',
      raw->'data'->'object'->'metadata'->>'booking_id',
      NULLIF(raw->'data'->'object'->>'amount','')::int,
      raw->'data'->'object'->>'currency',
      'failed',
      NULL,
      NULL,
      raw->'data'->'object'->'last_payment_error'->>'code',
      COALESCE((raw->>'livemode')::boolean, false),
      to_timestamp(NULLIF(raw->'data'->'object'->>'created','')::float),
      raw->'data'->'object'
    FROM risk_agent.stripe_events
    WHERE received_at > $1::timestamptz
      AND type = 'payment_intent.payment_failed'
      AND raw->'data'->'object'->>'id' LIKE 'pi_%'
    ORDER BY raw->'data'->'object'->>'id', received_at DESC
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      raw = EXCLUDED.raw
  `

  // Disputes: charge.dispute.* events
  const disputeSQL = `
    INSERT INTO risk_agent.disputes
      (id, charge_id, payment_intent, reason, amount_cents, currency, status,
       evidence_due_by, livemode, created_at, raw)
    SELECT DISTINCT ON (raw->'data'->'object'->>'id')
      raw->'data'->'object'->>'id',
      raw->'data'->'object'->>'charge',
      raw->'data'->'object'->>'payment_intent',
      raw->'data'->'object'->>'reason',
      NULLIF(raw->'data'->'object'->>'amount','')::int,
      raw->'data'->'object'->>'currency',
      raw->'data'->'object'->>'status',
      to_timestamp(NULLIF(raw->'data'->'object'->'evidence_details'->>'due_by','')::float),
      COALESCE((raw->>'livemode')::boolean, false),
      to_timestamp(NULLIF(raw->>'created','')::float),
      raw->'data'->'object'
    FROM risk_agent.stripe_events
    WHERE received_at > $1::timestamptz
      AND type LIKE 'charge.dispute.%'
      AND raw->'data'->'object'->>'id' LIKE 'du_%'
    ORDER BY raw->'data'->'object'->>'id', received_at DESC
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      evidence_due_by = EXCLUDED.evidence_due_by,
      raw = EXCLUDED.raw,
      updated_at = now()
  `

  if (!APPLY) {
    console.log('\nDRY RUN — counting what *would* be touched.')
    const wouldCharge = await db.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT raw->'data'->'object'->>'id')::bigint AS n
      FROM risk_agent.stripe_events
      WHERE received_at > ${SINCE}::timestamptz
        AND type IN ('charge.succeeded','charge.failed','charge.refunded','charge.captured','charge.updated')
        AND raw->'data'->'object'->>'id' LIKE 'ch_%'
    `
    const wouldPi = await db.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT raw->'data'->'object'->>'id')::bigint AS n
      FROM risk_agent.stripe_events
      WHERE received_at > ${SINCE}::timestamptz
        AND type = 'payment_intent.payment_failed'
        AND raw->'data'->'object'->>'id' LIKE 'pi_%'
    `
    const wouldDispute = await db.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(DISTINCT raw->'data'->'object'->>'id')::bigint AS n
      FROM risk_agent.stripe_events
      WHERE received_at > ${SINCE}::timestamptz
        AND type LIKE 'charge.dispute.%'
        AND raw->'data'->'object'->>'id' LIKE 'du_%'
    `
    console.log(`  charges (ch_*)   would be upserted: ${wouldCharge[0].n}`)
    console.log(`  payment intents (pi_*) would be upserted: ${wouldPi[0].n}`)
    console.log(`  disputes (du_*)  would be upserted: ${wouldDispute[0].n}`)
    console.log('\nRe-run with --apply to execute.')
    return
  }

  console.log('\nApplying...')
  const chargeRows: number = await db.$executeRawUnsafe(chargeSQL, SINCE)
  console.log(`  charges (ch_*) affected:  ${chargeRows}`)
  const piRows: number = await db.$executeRawUnsafe(piSQL, SINCE)
  console.log(`  payment intents (pi_*) affected: ${piRows}`)
  const disputeRows: number = await db.$executeRawUnsafe(disputeSQL, SINCE)
  console.log(`  disputes affected: ${disputeRows}`)
  console.log('Done.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
