# Live Workflow SQL Fixes

The live workflow `FC3vCAJZWDe5Ll2H` (MVR Stripe Chargeback Monitoring) has two SQL bugs that have been silently dropping events. The events themselves land in `risk_agent.stripe_events` correctly, but two specific Upsert nodes fail to push the data downstream.

**The historical gap is already filled** by `node scripts/reprocess-stripe-events.mjs`. Re-run that script anytime you suspect new gaps. But to stop new events from being dropped going forward, apply the fixes below to the live workflow in n8n's UI.

## Bug 1 — `Upsert Dispute` drops `charge.dispute.created` events

**Symptom**: a new dispute is opened in Stripe → n8n logs the event in `stripe_events` → but `risk_agent.disputes` doesn't get a row. The 2 most recent dispute.created events were affected before the recovery script ran.

**Root cause**: when `evidence_details.due_by` is null (it usually is for fresh disputes — Stripe doesn't set a deadline immediately), the n8n queryReplacement stringifies the JS `null` to the literal text `"null"`. The `CASE WHEN $8::text IS NOT NULL AND $8::text <> ''` check passes for the literal string "null", and then `CAST('null' AS bigint)` errors.

**Fix**: replace the SQL of the `Upsert Dispute` node with:

```sql
INSERT INTO risk_agent.disputes
  (id, charge_id, payment_intent, reason, amount_cents, currency, status,
   evidence_due_by, livemode, created_at, updated_at, raw)
SELECT $1,
       NULLIF($2, 'null'),
       NULLIF($3, 'null'),
       $4,
       $5::int,
       $6,
       $7,
       CASE WHEN NULLIF($8, 'null') IS NOT NULL AND $8 <> ''
            THEN to_timestamp(CAST($8 AS bigint))
            ELSE NULL END,
       $9::bool,
       to_timestamp($10::bigint),
       NOW(),
       $11::jsonb
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  reason = EXCLUDED.reason,
  evidence_due_by = EXCLUDED.evidence_due_by,
  updated_at = NOW(),
  raw = EXCLUDED.raw;
```

The `queryReplacement` already matches the parameter positions — no change needed there.

---

## Bug 2 — `Upsert Failed Charge` drops `payment_intent.payment_failed` events

**Symptom**: 90 events of type `payment_intent.payment_failed` arrived through the webhook but produced 0 rows in `risk_agent.transactions`. The team can't see them in the dashboard's `insufficient_funds` / `do_not_honor` breakdown.

**Root causes** (two combined):
1. The SQL has `WHERE $1 LIKE 'ch_%'` — but payment_intent IDs start with `pi_`, so the filter excludes them.
2. The PaymentIntent object's `status` is `requires_payment_method` (or `requires_action` / `canceled`), which violates the `chk_tx_status` check constraint that only allows `succeeded | failed | refunded`.
3. The outcome reason for payment_intents lives in `last_payment_error.decline_code`, not in `outcome.reason`.

**Fix**: replace the SQL of the `Upsert Failed Charge` node with:

```sql
INSERT INTO risk_agent.transactions
  (id, payment_intent, customer_id, booking_id, amount_cents, currency, status,
   risk_level, risk_score, outcome_reason, livemode, created_at, raw)
SELECT $1,
       NULLIF($2, 'null'),
       NULLIF($3, 'null'),
       NULLIF($4, 'null'),
       $5::int,
       $6,
       'failed',                     -- normalize any non-success status to 'failed'
       NULLIF($8, 'null'),
       NULLIF($9, 'null')::int,
       NULLIF($10, 'null'),
       $11::bool,
       to_timestamp($12::bigint),
       $13::jsonb
WHERE $1 LIKE 'ch_%' OR $1 LIKE 'pi_%'   -- accept both charge and payment_intent ids
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  risk_level = COALESCE(EXCLUDED.risk_level, risk_agent.transactions.risk_level),
  risk_score = COALESCE(EXCLUDED.risk_score, risk_agent.transactions.risk_score),
  outcome_reason = COALESCE(EXCLUDED.outcome_reason, risk_agent.transactions.outcome_reason),
  raw = EXCLUDED.raw;
```

Then update the **Query Replacement** (Options → Query Replacement) so it reads the failure reason from `last_payment_error.decline_code` when the event is a payment_intent:

```
={{ $json.data.object.id }},{{ $json.data.object.payment_intent || $json.data.object.id }},{{ $json.data.object.customer }},{{ ($json.data.object.metadata && $json.data.object.metadata.booking_id) || null }},{{ $json.data.object.amount }},{{ $json.data.object.currency }},{{ $json.data.object.status }},{{ ($json.data.object.outcome && $json.data.object.outcome.risk_level) || null }},{{ ($json.data.object.outcome && $json.data.object.outcome.risk_score) || null }},{{ ($json.data.object.outcome && $json.data.object.outcome.reason) || ($json.data.object.last_payment_error && ($json.data.object.last_payment_error.decline_code || $json.data.object.last_payment_error.code)) || null }},{{ $json.data.object.livemode }},{{ $json.data.object.created }},{{ JSON.stringify($json.data.object) }}
```

Note: `payment_intent` parameter ($2) falls back to the object's own id when the object IS a payment_intent (since it has no separate `payment_intent` field).

---

## Bug 3 (preventive) — other Upsert Charge nodes have the same null-cast risk

The nodes `Upsert Charge (Refund)`, `Upsert Elevated Risk Charge`, and `Upsert Charge (silent)` use the same SQL pattern but happen to receive payloads where `risk_score` is almost always present, so they haven't blown up yet. For safety, replace each of their SQL with the NULLIF-wrapped version (same shape as Bug 2's fix, minus the payment_intent escape hatch since those nodes only handle `ch_*` charges):

```sql
INSERT INTO risk_agent.transactions
  (id, payment_intent, customer_id, booking_id, amount_cents, currency, status,
   risk_level, risk_score, outcome_reason, livemode, created_at, raw)
SELECT $1,
       NULLIF($2, 'null'),
       NULLIF($3, 'null'),
       NULLIF($4, 'null'),
       $5::int,
       $6,
       $7,
       NULLIF($8, 'null'),
       NULLIF($9, 'null')::int,
       NULLIF($10, 'null'),
       $11::bool,
       to_timestamp($12::bigint),
       $13::jsonb
WHERE $1 LIKE 'ch_%'
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  risk_level = COALESCE(EXCLUDED.risk_level, risk_agent.transactions.risk_level),
  risk_score = COALESCE(EXCLUDED.risk_score, risk_agent.transactions.risk_score),
  outcome_reason = COALESCE(EXCLUDED.outcome_reason, risk_agent.transactions.outcome_reason),
  raw = EXCLUDED.raw;
```

queryReplacement stays the same.

---

## Verification after applying

1. Save the workflow in n8n.
2. Wait for the next Stripe event (or trigger a test event from Stripe Dashboard → Developers → Webhooks → your endpoint → "Send test webhook" → `charge.dispute.created` or `payment_intent.payment_failed`).
3. Check the workflow execution — it should turn green end-to-end.
4. Re-run `node scripts/check-risk-data.mjs` and confirm the gap-analysis section shows `tx_rows = events_received` and `disp_rows = events_received` across the board.

## Safety net

`scripts/reprocess-stripe-events.mjs` is idempotent. Schedule it via cron (or a future weekly n8n workflow) and it'll catch any new gaps even if the live workflow regresses. The `stripe_events` table is the durable source of truth — as long as Stripe's webhook is delivering, you can always rebuild `transactions` and `disputes` from it.
