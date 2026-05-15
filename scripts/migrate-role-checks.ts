// Batch-migrates role-based access checks (ALLOWED_*_ROLES.includes(...))
// to the new permission helpers (canView/canEdit). One-shot — delete after run.
//
// Run: npx tsx scripts/migrate-role-checks.ts
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

interface Target {
  path: string
  resource: string
  // 'auto' = GET→view, mutations→edit (default); 'view' = always view; 'edit' = always edit
  mode?: 'auto' | 'view' | 'edit'
}

const TARGETS: Target[] = [
  { path: 'app/api/v1/buildings/[id]/route.ts',                                resource: 'data_master.buildings' },
  { path: 'app/api/v1/buildings/[id]/property-managers/route.ts',             resource: 'data_master.buildings' },
  { path: 'app/api/v1/buildings/[id]/property-managers/[pmId]/route.ts',      resource: 'data_master.buildings' },
  { path: 'app/api/v1/units/route.ts',                                         resource: 'data_master.units' },
  { path: 'app/api/v1/units/[id]/route.ts',                                    resource: 'data_master.units' },
  { path: 'app/api/v1/owners/route.ts',                                        resource: 'data_master.owners' },
  { path: 'app/api/v1/owners/[id]/route.ts',                                   resource: 'data_master.owners' },
  { path: 'app/api/v1/unit-options/route.ts',                                  resource: 'data_master.units' },
  { path: 'app/api/v1/unit-options/[id]/route.ts',                             resource: 'data_master.units' },
  { path: 'app/api/v1/tickets/route.ts',                                       resource: 'customer_success.tickets' },
  { path: 'app/api/v1/tickets/[id]/route.ts',                                  resource: 'customer_success.tickets' },
  { path: 'app/api/v1/tickets/[id]/comments/route.ts',                         resource: 'customer_success.tickets' },
  { path: 'app/api/v1/risk/charges/route.ts',                                  resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/disputes/route.ts',                                 resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/refunds/route.ts',                                  resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/summary/route.ts',                                  resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/watchlist/route.ts',                                resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/watchlist/[id]/route.ts',                           resource: 'customer_success.chargebacks' },
  { path: 'app/api/v1/risk/rules/route.ts',                                    resource: 'customer_success.chargebacks_rules' },
  { path: 'app/api/v1/risk/rules/[id]/route.ts',                               resource: 'customer_success.chargebacks_rules' },
  { path: 'app/api/v1/risk/notify/route.ts',                                   resource: 'customer_success.chargebacks' },
]

function migrate(target: Target) {
  const fullPath = resolve(process.cwd(), target.path)
  if (!existsSync(fullPath)) {
    console.log(`  SKIP (missing): ${target.path}`)
    return
  }
  let src = readFileSync(fullPath, 'utf8')
  const before = src

  // 1. Drop `const ALLOWED_*_ROLES = [...]` constant declarations
  src = src.replace(
    /\nconst ALLOWED_[A-Z_]+_ROLES\s*=\s*\[[^\]]+\]\s*(as\s+const\s*)?\n/g,
    '\n'
  )

  // 2. Update imports: remove ALLOWED_RISK_ROLES from `@/lib/risk/schemas` imports
  src = src.replace(
    /import\s+\{([^}]*)\}\s+from\s+'@\/lib\/risk\/schemas'/g,
    (_match, inner) => {
      const items = inner
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && s !== 'ALLOWED_RISK_ROLES')
      if (items.length === 0) return ''
      return `import { ${items.join(', ')} } from '@/lib/risk/schemas'`
    }
  )

  // 3. Add `import { canEdit, canView } from '@/lib/auth/permissions'` after the `auth` import,
  //    if not already present.
  if (!src.includes("from '@/lib/auth/permissions'")) {
    src = src.replace(
      /(import\s+\{\s*auth\s*\}\s+from\s+'@\/lib\/auth')/,
      `$1\nimport { canEdit, canView } from '@/lib/auth/permissions'`
    )
  }

  // 4. Replace the role-check pattern with canView/canEdit. Detect the surrounding
  //    HTTP method by walking up to the enclosing `export async function METHOD(`.
  //    Simple approach: scan for each `if (!ALLOWED_*_ROLES.includes(session.user.role)) {`
  //    and replace with the appropriate helper based on method + override.
  const RE_ROLE_CHECK = /if\s*\(\s*!ALLOWED_[A-Z_]+_ROLES\.includes\(session\.user\.role\)\s*\)\s*\{[^}]*\}/g

  // Find each match and figure out which HTTP method block we're inside.
  const matches: Array<{ start: number; end: number; verb: 'view' | 'edit' }> = []
  let m: RegExpExecArray | null
  while ((m = RE_ROLE_CHECK.exec(src)) !== null) {
    const start = m.index
    const end = m.index + m[0].length
    // Look back for the nearest `export async function METHOD(`
    const slice = src.slice(0, start)
    const funcMatch = slice.match(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(/g)
    const last = funcMatch ? funcMatch[funcMatch.length - 1] : null
    const method = last?.match(/(GET|POST|PUT|PATCH|DELETE)/)?.[1] ?? 'GET'
    const verb: 'view' | 'edit' =
      target.mode === 'view' ? 'view'
      : target.mode === 'edit' ? 'edit'
      : method === 'GET' ? 'view' : 'edit'
    matches.push({ start, end, verb })
  }
  // Replace from end to start so offsets stay valid.
  for (let i = matches.length - 1; i >= 0; i--) {
    const { start, end, verb } = matches[i]
    const replacement = `if (!(await ${verb === 'view' ? 'canView' : 'canEdit'}(session, '${target.resource}'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }`
    src = src.slice(0, start) + replacement + src.slice(end)
  }

  if (src === before) {
    console.log(`  no change: ${target.path}`)
    return
  }
  writeFileSync(fullPath, src, 'utf8')
  console.log(`  migrated:  ${target.path}`)
}

for (const t of TARGETS) {
  migrate(t)
}

console.log('Done. Run `npx tsc --noEmit` to verify.')
