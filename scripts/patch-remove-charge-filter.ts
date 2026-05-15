// Remove the "WHERE $1 LIKE 'ch_%'" guard from all Upsert charge nodes so that
// payment_intent.payment_failed events (id = pi_*) get persisted too. User
// policy: store everything Stripe sends, filter in the UI.
//
// Run: npx tsx --env-file=.env.local scripts/patch-remove-charge-filter.ts [--apply]
const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'
const APPLY = process.argv.includes('--apply')

type N8nNode = { name: string; type: string; parameters: Record<string, unknown>; [k: string]: unknown }
type N8nWorkflow = { id: string; name: string; nodes: N8nNode[]; connections: Record<string, unknown>; settings: Record<string, unknown>; staticData?: unknown; [k: string]: unknown }

const TARGET_NODES = [
  'Upsert Charge (silent)',
  'Upsert Failed Charge',
  'Upsert Elevated Risk Charge',
  'Upsert Charge (Refund)',
]

async function fetchWorkflow(): Promise<N8nWorkflow> {
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${r.status}: ${await r.text()}`)
  return r.json() as Promise<N8nWorkflow>
}

async function putWorkflow(w: N8nWorkflow): Promise<void> {
  const allowed = new Set(['saveExecutionProgress','saveManualExecutions','saveDataErrorExecution','saveDataSuccessExecution','executionTimeout','errorWorkflow','timezone','executionOrder'])
  const filteredSettings: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(w.settings ?? {})) {
    if (allowed.has(k)) filteredSettings[k] = v
  }
  const body = { name: w.name, nodes: w.nodes, connections: w.connections, settings: filteredSettings, staticData: w.staticData ?? null }
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    method: 'PUT',
    headers: { 'X-N8N-API-KEY': API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(`PUT ${r.status}: ${await r.text()}`)
}

async function main() {
  const w = await fetchWorkflow()
  let changed = 0
  for (const node of w.nodes) {
    if (!TARGET_NODES.includes(node.name)) continue
    const params = node.parameters
    const oldQ = params.query as string
    if (!oldQ.includes("WHERE $1 LIKE 'ch_%'")) {
      console.log(`  ok  ${node.name.padEnd(32)} already has no ch_ filter`)
      continue
    }
    // Drop the WHERE clause: replace "WHERE $1 LIKE 'ch_%' ON CONFLICT" with "ON CONFLICT"
    const newQ = oldQ.replace(/\s+WHERE \$1 LIKE 'ch_%'\s+/, ' ')
    if (newQ === oldQ) {
      console.log(`  !!  ${node.name.padEnd(32)} could not strip WHERE (regex miss)`)
      continue
    }
    console.log(`  +   ${node.name.padEnd(32)} stripped WHERE $1 LIKE 'ch_%'`)
    params.query = newQ
    changed++
  }
  console.log(`\nNodes changed: ${changed}`)
  if (!APPLY) {
    console.log('DRY RUN. Re-run with --apply.')
    return
  }
  console.log('Applying...')
  await putWorkflow(w)
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
