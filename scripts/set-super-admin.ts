/**
 * scripts/set-super-admin.ts
 * Upserts the given email as super_admin in the users table.
 *
 * Run against production (Cloud SQL proxy must be running):
 *   npx ts-node -P tsconfig.json scripts/set-super-admin.ts
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const TARGET_EMAIL = 'a.santa@miamivacationrentals.com'
const TARGET_NAME  = 'Andrés Felipe Santa'

async function main() {
  const user = await db.user.upsert({
    where:  { email: TARGET_EMAIL },
    update: { role: 'super_admin' },
    create: {
      email:    TARGET_EMAIL,
      name:     TARGET_NAME,
      role:     'super_admin',
      isActive: true,
    },
  })

  console.log(`✅  ${user.email} → role: ${user.role}  (id: ${user.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
