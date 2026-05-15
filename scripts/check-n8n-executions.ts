// Probe n8n REST API with several auth header variants and endpoints.
const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!

if (!API_KEY) { console.error('Missing N8N_API_KEY'); process.exit(1) }

type Attempt = { base: string; path: string; auth: Record<string, string> }
const attempts: Attempt[] = [
  { base: 'https://service.mvr-management.com/api/v1', path: '/workflows', auth: { 'X-N8N-API-KEY': API_KEY } },
  { base: 'https://service.mvr-management.com/api/v1', path: '/workflows', auth: { Authorization: `Bearer ${API_KEY}` } },
  { base: 'https://service.mvr-management.com/api/v1', path: `/executions?workflowId=${WORKFLOW_ID}&limit=5`, auth: { 'X-N8N-API-KEY': API_KEY } },
  { base: 'https://service.mvr-management.com/api/v1', path: `/executions?workflowId=${WORKFLOW_ID}&limit=5`, auth: { Authorization: `Bearer ${API_KEY}` } },
  { base: 'https://service.mvr-management.com/rest', path: '/workflows', auth: { 'X-N8N-API-KEY': API_KEY } },
  { base: 'https://service.mvr-management.com/rest', path: '/login', auth: { 'X-N8N-API-KEY': API_KEY } },
]

async function main() {
  for (const a of attempts) {
    const url = `${a.base}${a.path}`
    const headerNames = Object.keys(a.auth).join(',')
    console.log(`\n${headerNames}  GET ${a.base}${a.path}`)
    try {
      const r = await fetch(url, { headers: { ...a.auth, Accept: 'application/json' } })
      const body = await r.text()
      console.log(`  HTTP ${r.status}  ${body.slice(0, 200)}`)
    } catch (e) {
      console.log(`  fetch error: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
