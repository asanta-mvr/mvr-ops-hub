// Poll n8n for new executions of the chargeback monitoring workflow and report
// whether they succeeded after the patch.
const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'
const CUTOFF = new Date('2026-05-14T12:56:50Z') // patch was applied at this time

async function checkActive() {
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${r.status}: ${await r.text()}`)
  const w = await r.json() as Record<string, unknown>
  return { active: w.active as boolean, updatedAt: w.updatedAt as string }
}

async function listSince() {
  const r = await fetch(`${BASE}/executions?workflowId=${WORKFLOW_ID}&limit=20`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`GET ${r.status}: ${await r.text()}`)
  const j = await r.json() as { data: Array<Record<string, unknown>> }
  return j.data.filter(e => new Date(e.startedAt as string) > CUTOFF)
}

async function main() {
  const { active, updatedAt } = await checkActive()
  console.log(`Workflow active=${active}  updatedAt=${updatedAt}`)
  if (!active) {
    console.log('⚠ Workflow is NOT active. Activating...')
    const ar = await fetch(`${BASE}/workflows/${WORKFLOW_ID}/activate`, {
      method: 'POST',
      headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
    })
    console.log(`Activate: ${ar.status}`)
  }

  console.log(`\nWatching for new executions since patch (${CUTOFF.toISOString()})...`)
  console.log('(stripe sends ~3.5 webhooks/hr; expect first new exec within minutes)\n')

  let seen = new Set<string>()
  for (let i = 0; i < 30; i++) {
    const execs = await listSince()
    for (const e of execs) {
      const id = e.id as string
      if (seen.has(id)) continue
      seen.add(id)
      console.log(`  [${new Date().toISOString()}] new exec ${id}  status=${e.status}  mode=${e.mode}  startedAt=${e.startedAt}`)
    }
    if (execs.length > 0) {
      const successCount = execs.filter(e => e.status === 'success').length
      const errorCount = execs.filter(e => e.status === 'error').length
      console.log(`\n  Summary so far: ${successCount} success / ${errorCount} error`)
      if (errorCount > 0) {
        const first = execs.find(e => e.status === 'error')
        if (first) console.log(`  ⚠ First error exec id=${first.id} — fetch detail with: dump-n8n-execution.ts`)
      }
      if (successCount >= 1) {
        console.log('\n✓ At least 1 success — patch is working.')
        return
      }
    }
    await new Promise(r => setTimeout(r, 30_000))
  }
  console.log('\n(timed out waiting 15 min — re-run to keep watching)')
}

main().catch(e => { console.error(e); process.exit(1) })
