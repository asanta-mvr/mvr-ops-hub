import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireEdit, isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { InviteUserForm } from '@/components/modules/settings/users/InviteUserForm'

export const metadata: Metadata = { title: 'Settings · Invite user' }
export const dynamic = 'force-dynamic'

export default async function InviteUserPage() {
  const session = await auth()
  await requireEdit(session, 'settings.users', '/no-access')

  const roles = await db.role.findMany({
    orderBy: [{ rank: 'desc' }, { name: 'asc' }],
    select: { id: true, name: true, permissions: true },
  })
  const roleOptions = roles.map((r) => ({
    id: r.id,
    name: r.name,
    permissions: Array.isArray(r.permissions)
      ? (r.permissions as unknown[])
          .filter((x): x is { resource: string; level: string } =>
            !!x && typeof x === 'object' && 'resource' in x && 'level' in x
          )
          .map((x) => ({ resource: String(x.resource), level: String(x.level) }))
      : [],
  }))

  return <InviteUserForm roles={roleOptions} canGrantFull={isSuperAdmin(session!.user.role)} />
}
