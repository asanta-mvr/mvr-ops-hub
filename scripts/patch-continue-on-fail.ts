// Apply continueOnFail=true to all Slack and Log Action nodes so that a Slack
// outage or a token expiration never blocks DB persistence again.
//
// Run: npx tsx --env-file=.env.local scripts/patch-continue-on-fail.ts [--apply]
const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'
const APPLY = process.argv.includes('--apply')

type N8nNode = { name: string; type: string; continueOnFail?: boolean; parameters: Record<string, unknown>; [k: string]: unknown }
type N8nWorkflow = { id: string; name: string; active: boolean; nodes: N8nNode[]; connections: Record<string, unknown>; settings: Record<string, unknown>; staticData?: unknown; [k: string]: unknown }

// Target node types where a downstream failure must NOT abort the workflow.
// We do NOT mark Postgres Upserts with continueOnFail — those failures should
// abort because losing a transaction insert is a real bug we want to see.
const TARGET_TYPES = new Set([
  'n8n-nodes-base.slack',
])
// Log Action nodes are postgres but secondary; treat by name pattern.
const NAME_PATTERN = /^Log .* Action$/

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
    const shouldMark = TARGET_TYPES.has(node.type) || NAME_PATTERN.test(node.name)
    if (!shouldMark) continue
    if (node.continueOnFail === true) {
      console.log(`  ok  ${node.name.padEnd(30)} already has continueOnFail`)
      continue
    }
    console.log(`  +   ${node.name.padEnd(30)} setting continueOnFail=true`)
    node.continueOnFail = true
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
