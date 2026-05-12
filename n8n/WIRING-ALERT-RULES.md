# Wiring Alert Rules into the Live n8n Workflow

The live workflow `FC3vCAJZWDe5Ll2H` (MVR Stripe Chargeback Monitoring) currently sends every Slack notification to the hardcoded `test-ti` channel (`C098R8ZMZTL`). After this change, channel + priority come from `public.notification_rules` configured in the ops hub.

## Prereq (already done)

- `public.match_notification_rule(text, text, text, bigint)` SQL function is installed in Cloud SQL via `node scripts/install-rule-match-fn.mjs`.
- The function returns `{ rule_id, channel, priority }` for the highest-priority enabled rule whose criteria match the event, or no rows if nothing matches.
- 2 default rules are seeded: **Highest Risk Charge** (`riskLevel=highest`, p1) and **Insufficient Funds Decline** (`reason=insufficient_funds`, high).

## Manual edits in the n8n UI

Open the workflow: https://service.mvr-management.com/workflow/FC3vCAJZWDe5Ll2H

### Step 1 — Add the "Lookup Notification Rule" node

1. Click the **+** between `Restore Event Data` and `Route by Event Type`.
2. Add a **Postgres** node (n8n-nodes-base.postgres v2.6).
3. Configure:
   - **Credential**: same as the existing `Persist Stripe Event` node ("Cloud SQL — risk_agent (writer)" or whatever it's named).
   - **Operation**: `Execute Query`.
   - **Query**:
     ```sql
     SELECT * FROM public.match_notification_rule($1, $2, $3, $4)
     ```
   - **Options → Query Replacement** (expression mode):
     ```
     ={{ ($json.data.object.outcome && $json.data.object.outcome.reason) || $json.data.object.failure_code || null }},{{ ($json.data.object.outcome && $json.data.object.outcome.risk_level) || null }},{{ $json.data.object.status || null }},{{ $json.data.object.amount || 0 }}
     ```
4. Rename the node to **`Lookup Notification Rule`** (exact name — Slack nodes reference it by name).
5. Make sure the connections are: `Restore Event Data` → `Lookup Notification Rule` → `Route by Event Type`.

### Step 2 — Each Slack node reads channel from the lookup

The workflow has 6 Slack nodes: `Slack Dispute Alert`, `Slack Fraud Warning`, `Slack Risk Review`, `Slack Refund Logged`, `Slack Failed Payment`, `Slack Elevated Risk Alert`. For each one:

1. Open the node.
2. **Send Message To → Channel** — switch the field to **Expression** mode.
3. Paste:
   ```
   ={{ $("Lookup Notification Rule").first().json.channel || "C098R8ZMZTL" }}
   ```
4. (Optional) In the message text, prefix priority for p1 alerts:
   ```
   ={{ $("Lookup Notification Rule").first().json.priority === "p1" ? "<!channel> *P1* " : ($("Lookup Notification Rule").first().json.priority === "high" ? "*HIGH* " : "") }}
   ```
   Append before the existing message body.

### Step 3 — Each Log Action node writes `rule_id`

The workflow has Log Action Postgres nodes that INSERT into `risk_agent.actions`. The `rule_id` column there is already populated but currently with a hardcoded value. Change it to:

1. Open each Log Action node.
2. In the `queryReplacement` expression, replace the literal rule id (`'manual'` or `'auto'`) with:
   ```
   {{ $("Lookup Notification Rule").first().json.rule_id || 'fallback' }}
   ```

### Step 4 — Save + activate

n8n auto-saves. The workflow stays active throughout — but you may want to deactivate briefly, save, then reactivate to ensure no in-flight execution uses a half-updated state.

## How to verify

1. In ops hub, go to `/customer-success/chargebacks/rules`.
2. Edit "Highest Risk Charge" → change its channel to a different Slack channel id (any channel the bot is in).
3. In Stripe Dashboard (test mode), use **Send test webhook** to fire a `charge.succeeded` event with `outcome.risk_level=highest`.
4. Check n8n executions: the new `Lookup Notification Rule` node should return the rule row.
5. Check Slack: the alert should land in the NEW channel you set, NOT `test-ti`.
6. Toggle the rule OFF (`enabled=false`) → next event → fallback to `test-ti`.

## What happens if no rule matches

The function returns 0 rows. The expression `$("Lookup Notification Rule").first().json.channel` is `undefined`, so the `||` fallback kicks in and the message lands in `C098R8ZMZTL` (`test-ti`). No alerts are ever dropped.

## Rollback

If anything goes wrong, in the Slack nodes revert the `channelId` expression back to the literal `C098R8ZMZTL`. The Lookup Notification Rule node can be deleted; the workflow falls back to its original hardcoded behavior. The `public.match_notification_rule` function is harmless if unused.
