// Snapshot the chargeback monitoring workflow to a local file before patching.
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'

async function main() {
  const r = await fetch(`${BASE}/workflows/${WORKFLOW_ID}`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) {
    console.error(`HTTP ${r.status}: ${await r.text()}`)
    process.exit(1)
  }
  const w = await r.json() as Record<string, unknown>
  const dir = 'n8n-snapshots'
  mkdirSync(dir, { recursive: true })
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const path = join(dir, `${WORKFLOW_ID}_${ts}.json`)
  writeFileSync(path, JSON.stringify(w, null, 2))
  console.log(`Saved snapshot to ${path}`)
  console.log(`Workflow: ${w.name}  active=${w.active}  updatedAt=${w.updatedAt}`)
  const nodes = w.nodes as Array<{ name: string }>
  console.log(`Nodes: ${nodes.length}`)
}

main().catch(e => { console.error(e); process.exit(1) })
