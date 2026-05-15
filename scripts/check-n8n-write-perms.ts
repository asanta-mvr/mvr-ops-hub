// Probe whether the n8n DB user can INSERT into risk_agent.transactions.
// We don't know which user n8n uses, but if the privileges differ from our reader,
// listing grants tells us what's wrong.
import { PrismaClient as RiskClient } from '@/lib/generated/risk-client'

const db = new RiskClient({
  datasources: { db: { url: process.env.RISK_DATABASE_URL } },
})

async function main() {
  console.log('=== Table privileges in risk_agent schema ===')
  const grants = await db.$queryRaw<Array<{
    grantee: string
    table_name: string
    privilege_type: string
  }>>`
    SELECT grantee, table_name, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'risk_agent'
      AND grantee NOT IN ('postgres', 'cloudsqlsuperuser')
    ORDER BY grantee, table_name, privilege_type
  `
  let currentGrantee = ''
  for (const g of grants) {
    if (g.grantee !== currentGrantee) {
      console.log(`\n${g.grantee}:`)
      currentGrantee = g.grantee
    }
    console.log(`  ${g.table_name.padEnd(20)}  ${g.privilege_type}`)
  }

  console.log('\n=== Schema usage grants ===')
  const schemaGrants = await db.$queryRaw<Array<{
    grantee: string
    privilege_type: string
  }>>`
    SELECT grantee, privilege_type
    FROM information_schema.usage_privileges
    WHERE object_schema = 'risk_agent'
      AND grantee NOT IN ('postgres', 'cloudsqlsuperuser')
    ORDER BY grantee
  `
  for (const g of schemaGrants) console.log(`  ${g.grantee.padEnd(25)}  ${g.privilege_type}`)

  console.log('\n=== Connected as ===')
  const me = await db.$queryRaw<Array<{ current_user: string }>>`SELECT current_user`
  console.log(' ', me[0].current_user)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
