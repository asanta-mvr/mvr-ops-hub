// Patch the chargeback monitoring workflow to fix two bugs:
//   Bug #1 — Upsert nodes: integer params can be the literal string "null", crashing
//            Postgres. Wrap nullable int/float params with NULLIF($N::text, 'null')::TYPE.
//   Bug #2 — Log Action nodes: queryReplacement passes only 2 {{ }} expressions but SQL
//            expects $3 too. Drop $3 from SQL by hard-coding notified_channel = 'slack'
//            and removing the trailing 'test-ti...' literal from queryReplacement.
//
// Run: npx tsx --env-file=.env.local scripts/patch-n8n-workflow.ts [--apply]
// Without --apply it prints a dry-run diff; with --apply it PUTs to n8n.

const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'
const APPLY = process.argv.includes('--apply')

type N8nNode = {
  id?: string
  name: string
  type: string
  parameters: Record<string, unknown>
  [k: string]: unknown
}
type N8nWorkflow = {
  id: string
  name: string
  active: boolean
  nodes: N8nNode[]
  connections: Record<string, unknown>
  settings: Record<string, unknown>
  staticData?: unknown
  [k: string]: unknown
}

// ── Patches ────────────────────────────────────────────────────────────────

type Patch = { node: string; newQuery?: string; newQueryReplacement?: string }

// For Upsert nodes the integer parameter positions that can be null:
//   risk_score is $9 in (silent), (Failed), (Elevated). $7 in (Refund).
//   evidence_due_by is $8 in Upsert Dispute (passed to to_timestamp).
//   amount_refunded is $7 in Upsert Charge (Refund) and is used in CASE WHEN $7::int comparisons.
const upsertChargeSQL = `INSERT INTO risk_agent.transactions (id, payment_intent, customer_id, booking_id, amount_cents, currency, status, risk_level, risk_score, outcome_reason, livemode, created_at, raw) SELECT $1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9::text, 'null')::int, $10, $11, to_timestamp($12), COALESCE((SELECT raw->'data'->'object' FROM risk_agent.stripe_events WHERE id = $13), '{}'::jsonb) WHERE $1 LIKE 'ch_%' ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, raw = EXCLUDED.raw;`

const upsertElevatedSQL = `INSERT INTO risk_agent.transactions (id, payment_intent, customer_id, booking_id, amount_cents, currency, status, risk_level, risk_score, outcome_reason, livemode, created_at, raw) SELECT $1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9::text, 'null')::int, $10, $11, to_timestamp($12), COALESCE((SELECT raw->'data'->'object' FROM risk_agent.stripe_events WHERE id = $13), '{}'::jsonb) WHERE $1 LIKE 'ch_%' ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, risk_level = EXCLUDED.risk_level, risk_score = COALESCE(EXCLUDED.risk_score, risk_agent.transactions.risk_score), raw = EXCLUDED.raw;`

const upsertRefundSQL = `INSERT INTO risk_agent.transactions (id, payment_intent, customer_id, booking_id, amount_cents, currency, status, risk_level, risk_score, outcome_reason, livemode, created_at, raw) SELECT $1, $2, $3, $4, $5, $6, CASE WHEN NULLIF($7::text,'null')::int > 0 AND NULLIF($7::text,'null')::int < $5::int THEN 'partially_refunded' ELSE 'refunded' END, $8, NULLIF($9::text,'null')::int, $10, $11, to_timestamp($12), COALESCE((SELECT raw->'data'->'object' FROM risk_agent.stripe_events WHERE id = $13), '{}'::jsonb) WHERE $1 LIKE 'ch_%' ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, raw = EXCLUDED.raw;`

const upsertDisputeSQL = `INSERT INTO risk_agent.disputes (id, charge_id, payment_intent, reason, amount_cents, currency, status, evidence_due_by, livemode, created_at, raw) SELECT $1, $2, $3, $4, $5, $6, $7, to_timestamp(NULLIF($8::text,'null')::float), $9, to_timestamp($10), COALESCE((SELECT raw->'data'->'object' FROM risk_agent.stripe_events WHERE id = $11), '{}'::jsonb) ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, evidence_due_by = EXCLUDED.evidence_due_by, raw = EXCLUDED.raw, updated_at = now();`

// Log Action SQL — drop $3, hardcode notified_channel
function logActionSQL(subjectType: string, ruleId: string, action: string): string {
  return `INSERT INTO risk_agent.actions (subject_type, subject_id, rule_id, action, payload, notified_at, notified_channel) VALUES ('${subjectType}', $1, '${ruleId}', '${action}', $2::jsonb, now(), 'slack');`
}

// Log Action queryReplacement — keep only first 2 {{ }} expressions, drop the trailing literal
function trimLogActionRepl(original: string): string {
  // The replacements have shape:  ={{ X }},{{ Y }},test-ti
  // We want:                      ={{ X }},{{ Y }}
  // Find the last `}}` and slice to there.
  const lastClose = original.lastIndexOf('}}')
  if (lastClose < 0) return original
  return original.slice(0, lastClose + 2)
}

const patches: Patch[] = [
  { node: 'Upsert Charge (silent)', newQuery: upsertChargeSQL },
  { node: 'Upsert Failed Charge', newQuery: upsertChargeSQL },
  { node: 'Upsert Elevated Risk Charge', newQuery: upsertElevatedSQL },
  { node: 'Upsert Charge (Refund)', newQuery: upsertRefundSQL },
  { node: 'Upsert Dispute', newQuery: upsertDisputeSQL },
  // Log Actions: drop $3 from SQL, trim queryReplacement
  { node: 'Log Dispute Action', newQuery: logActionSQL('dispute', 'AUTO_NOTIFY_DISPUTE', 'manual_review') },
  { node: 'Log Fraud Action', newQuery: logActionSQL('early_fraud_warning', 'AUTO_NOTIFY_EFW', 'manual_review') },
  { node: 'Log Review Action', newQuery: logActionSQL('review', 'AUTO_NOTIFY_REVIEW', 'manual_review') },
  { node: 'Log Refund Action', newQuery: logActionSQL('transaction', 'AUTO_NOTIFY_REFUND', 'refund_logged') },
  { node: 'Log Failed Action', newQuery: logActionSQL('transaction', 'AUTO_NOTIFY_FAILED', 'manual_review') },
  { node: 'Log Elevated Risk Action', newQuery: logActionSQL('transaction', 'AUTO_NOTIFY_ELEVATED_RISK', 'manual_review') },
]

// ── Main ───────────────────────────────────────────────────────────────────

async function fetchWorkflow(): Promise<N8nWorkflow> {
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${r.status}: ${await r.text()}`)
  return r.json() as Promise<N8nWorkflow>
}

async function putWorkflow(w: N8nWorkflow): Promise<void> {
  // n8n public API rejects extraneous fields on PUT. Whitelist what's allowed.
  // settings: only the keys the public API schema accepts.
  const allowedSettingsKeys = new Set([
    'saveExecutionProgress', 'saveManualExecutions', 'saveDataErrorExecution',
    'saveDataSuccessExecution', 'executionTimeout', 'errorWorkflow', 'timezone',
    'executionOrder',
  ])
  const filteredSettings: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(w.settings ?? {})) {
    if (allowedSettingsKeys.has(k)) filteredSettings[k] = v
  }
  const body = {
    name: w.name,
    nodes: w.nodes,
    connections: w.connections,
    settings: filteredSettings,
    staticData: w.staticData ?? null,
  }
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PUT ${r.status}: ${await r.text()}`)
  const j = await r.json()
  console.log('PUT ok:', JSON.stringify(j).slice(0, 200))
}

async function main() {
  const w = await fetchWorkflow()
  console.log(`Loaded "${w.name}" — ${w.nodes.length} nodes — active=${w.active}`)

  let changed = 0
  for (const p of patches) {
    const node = w.nodes.find(n => n.name === p.node)
    if (!node) {
      console.log(`  ⚠ node not found: ${p.node}`)
      continue
    }
    const params = node.parameters as Record<string, unknown>
    const currentQuery = params.query as string
    const options = (params.options ?? {}) as Record<string, unknown>
    const currentRepl = options.queryReplacement as string | undefined

    let didChange = false

    if (p.newQuery && p.newQuery !== currentQuery) {
      console.log(`\n>>> ${p.node}: SQL changed`)
      console.log(`    OLD: ${currentQuery.slice(0, 150)}...`)
      console.log(`    NEW: ${p.newQuery.slice(0, 150)}...`)
      params.query = p.newQuery
      didChange = true
    }

    // For Log Action nodes, also trim the queryReplacement
    if (p.node.startsWith('Log ') && currentRepl) {
      const trimmed = trimLogActionRepl(currentRepl)
      if (trimmed !== currentRepl) {
        console.log(`    REPL OLD ends with: ${currentRepl.slice(-40)}`)
        console.log(`    REPL NEW ends with: ${trimmed.slice(-40)}`)
        options.queryReplacement = trimmed
        params.options = options
        didChange = true
      }
    }

    if (didChange) changed++
  }

  console.log(`\nNodes changed: ${changed}`)
  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with --apply to push to n8n.')
    return
  }

  console.log('\nApplying via PUT...')
  await putWorkflow(w)
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
