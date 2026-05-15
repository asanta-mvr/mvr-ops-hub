// One-shot seed: upserts the super_admin user and grants `edit` on every
// known resource. Idempotent — safe to re-run. All other existing users get
// nothing (they'll see /no-access until the super_admin assigns permissions).
//
// Run: npx tsx --env-file=.env.local scripts/seed-super-admin-permissions.ts
import { db } from '@/lib/db'
import { RESOURCES } from '@/lib/auth/resources'

async function main() {
  const email =
    process.env.SEED_SUPER_ADMIN_EMAIL ??
    process.env.DEV_LOGIN_EMAIL ??
    'a.santa@miamivacationrentals.com'

  console.log(`Seeding super_admin permissions for ${email}`)

  const user = await db.user.upsert({
    where: { email },
    update: { role: 'super_admin', isActive: true },
    create: {
      email,
      name: 'Andrés Santa',
      role: 'super_admin',
      isActive: true,
    },
  })

  let created = 0
  let updated = 0
  for (const r of RESOURCES) {
    const existing = await db.userPermission.findUnique({
      where: { userId_resource: { userId: user.id, resource: r.key } },
    })
    if (existing) {
      if (existing.level !== 'edit') {
        await db.userPermission.update({
          where: { id: existing.id },
          data: { level: 'edit' },
        })
        updated++
      }
    } else {
      await db.userPermission.create({
        data: {
          userId: user.id,
          resource: r.key,
          level: 'edit',
          createdBy: user.id,
        },
      })
      created++
    }
  }

  console.log(`User: ${user.id} (${user.email}) — role=${user.role}`)
  console.log(`Permissions: ${created} created · ${updated} updated · ${RESOURCES.length - created - updated} already current`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
