// Fetch full detail of recent failed executions to find the failing node + error.
const WORKFLOW_ID = 'FC3vCAJZWDe5Ll2H'
const API_KEY = process.env.N8N_API_KEY!
const BASE = 'https://service.mvr-management.com/api/v1'

async function listRecent() {
  const r = await fetch(`${BASE}/executions?workflowId=${WORKFLOW_ID}&limit=15`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`list ${r.status}: ${await r.text()}`)
  const j = await r.json() as { data: Array<Record<string, unknown>> }
  return j.data
}

async function fetchDetail(id: string) {
  const r = await fetch(`${BASE}/executions/${id}?includeData=true`, {
    headers: { 'X-N8N-API-KEY': API_KEY, Accept: 'application/json' },
  })
  if (!r.ok) throw new Error(`detail ${r.status}: ${await r.text()}`)
  return r.json() as Promise<Record<string, unknown>>
}

async function main() {
  const list = await listRecent()
  console.log(`\n=== Last ${list.length} executions ===`)
  for (const e of list) {
    console.log(`  ${(e.startedAt as string).padEnd(28)}  status=${String(e.status).padEnd(8)}  mode=${String(e.mode).padEnd(8)}  id=${e.id}`)
  }

  const failures = list.filter(e => e.status === 'error')
  console.log(`\n${failures.length} failed executions. Inspecting up to 3 of them.`)

  for (const e of failures.slice(0, 3)) {
    console.log('\n' + '='.repeat(78))
    console.log(`Execution ${e.id} — startedAt ${e.startedAt}`)
    console.log('='.repeat(78))

    const detail = await fetchDetail(e.id as string)
    const data = detail.data as Record<string, unknown> | undefined
    const resultData = data?.resultData as Record<string, unknown> | undefined
    const lastNode = resultData?.lastNodeExecuted as string | undefined
    const error = resultData?.error as Record<string, unknown> | undefined
    const runData = resultData?.runData as Record<string, Array<Record<string, unknown>>> | undefined

    console.log(`lastNodeExecuted: ${lastNode}`)
    if (error) {
      console.log('\nerror.message    :', error.message)
      console.log('error.name       :', error.name)
      console.log('error.node.name  :', (error.node as Record<string, unknown> | undefined)?.name)
      console.log('error.node.type  :', (error.node as Record<string, unknown> | undefined)?.type)
      console.log('error.description:', error.description)
      const context = error.context as Record<string, unknown> | undefined
      if (context) {
        console.log('error.context    :', JSON.stringify(context).slice(0, 500))
      }
      const cause = error.cause as Record<string, unknown> | undefined
      if (cause) {
        console.log('error.cause      :', JSON.stringify(cause).slice(0, 600))
      }
      const stack = error.stack as string | undefined
      if (stack) console.log('error.stack[0..400]:', stack.slice(0, 400))
    }

    if (runData) {
      console.log('\nNodes that ran (with status):')
      for (const [nodeName, runs] of Object.entries(runData)) {
        const last = runs[runs.length - 1]
        const err = last?.error
        const flag = err ? 'ERR' : 'ok'
        const errMsg = err ? `  -> ${(err as Record<string, unknown>).message}` : ''
        console.log(`  ${flag}  ${nodeName}${errMsg}`)
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1) })
