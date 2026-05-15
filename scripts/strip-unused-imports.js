// One-shot cleanup: drops unused canView/canEdit and redirect imports that
// my role-check migration left behind. Run from repo root with `node`.
const fs = require('node:fs')

const FILES = [
  'app/(dashboard)/customer-success/chargebacks/page.tsx',
  'app/(dashboard)/customer-success/chargebacks/rules/page.tsx',
  'app/api/v1/buildings/[id]/property-managers/[pmId]/route.ts',
  'app/api/v1/buildings/[id]/property-managers/route.ts',
  'app/api/v1/buildings/[id]/route.ts',
  'app/api/v1/owners/[id]/route.ts',
  'app/api/v1/owners/route.ts',
  'app/api/v1/risk/charges/route.ts',
  'app/api/v1/risk/disputes/route.ts',
  'app/api/v1/risk/notify/route.ts',
  'app/api/v1/risk/refunds/route.ts',
  'app/api/v1/risk/rules/[id]/route.ts',
  'app/api/v1/risk/summary/route.ts',
  'app/api/v1/risk/watchlist/[id]/route.ts',
  'app/api/v1/unit-options/[id]/route.ts',
  'app/api/v1/unit-options/route.ts',
  'app/api/v1/units/[id]/route.ts',
  'app/api/v1/units/route.ts',
]

function trimImport(src, modulePath) {
  const re = new RegExp(
    String.raw`import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]` +
      modulePath.replace(/\//g, '\\/') +
      String.raw`['"];?\r?\n?`
  )
  const m = src.match(re)
  if (!m) return src
  const names = m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const rest = src.replace(re, '')
  const used = names.filter((n) => new RegExp(`(?<![\\w])${n}\\(`).test(rest))
  if (used.length === 0) return src.replace(re, '')
  if (used.length === names.length) return src
  return src.replace(re, `import { ${used.join(', ')} } from '${modulePath}'\n`)
}

let touched = 0
for (const f of FILES) {
  if (!fs.existsSync(f)) {
    console.log('missing:', f)
    continue
  }
  const before = fs.readFileSync(f, 'utf8')
  let after = trimImport(before, '@/lib/auth/permissions')
  after = trimImport(after, 'next/navigation')
  if (after !== before) {
    fs.writeFileSync(f, after, 'utf8')
    touched++
    console.log('fixed:', f)
  } else {
    console.log('no-op:', f)
  }
}
console.log(`\nTouched ${touched} files`)
