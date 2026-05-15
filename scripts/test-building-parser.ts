// Verify extractBuilding() against real property strings from the DB.
import { extractBuilding } from '@/components/modules/customer-success/chargebacks/charge-metadata'

const cases: Array<[string | null, string | null]> = [
  ['Icon 3901', 'Icon'],
  ['Arya 1708-1', 'Arya'],
  ['Elser 4202 Copia', 'Elser'],
  ['PO 1405-1', 'PO'],
  ['Elser 4202 Copia ', 'Elser'],
  ['icon2201', 'icon'],
  ['Brickell House 2201', 'Brickell House'],
  ['  Icon  3901  ', 'Icon'],
  [null, null],
  ['', null],
  ['NoNumberHere', 'NoNumberHere'],
  ['123 Sesame', null],
]

let pass = 0
let fail = 0
for (const [input, expected] of cases) {
  const got = extractBuilding(input)
  const ok = got === expected
  if (ok) pass++
  else fail++
  console.log(`${ok ? 'ok' : 'FAIL'}  ${JSON.stringify(input).padEnd(28)} → ${JSON.stringify(got)} (expected ${JSON.stringify(expected)})`)
}
console.log(`\n${pass}/${pass + fail} passed`)
if (fail > 0) process.exit(1)
