import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { isSuperAdmin, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { UserPermissionsForm } from '@/components/modules/settings/UserPermissionsForm'

export const metadata: Metadata = { title: 'Settings · Edit user' }
export const dynamic = 'force-dynamic'

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await auth()
  await requireView(session, 'settings.users', '/no-access')

  const [user, roles] = await Promise.all([
    db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        customRoleId: true,
        isActive: true,
        lastLoginAt: true,
        permissions: { select: { resource: true, level: true } },
      },
    }),
    db.role.findMany({
      orderBy: [{ rank: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, permissions: true },
    }),
  ])

  if (!user) notFound()

  const isSelf = session!.user.id === user.id

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

  return (
    <div className="space-y-4 max-w-4xl">
      <Link
        href="/settings/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-mvr-primary"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to users
      </Link>
      <UserPermissionsForm
        userId={user.id}
        email={user.email}
        name={user.name}
        isActive={user.isActive}
        isSelf={isSelf}
        isSuperAdmin={isSuperAdmin(user.role)}
        viewerIsSuperAdmin={isSuperAdmin(session!.user.role)}
        initialRoleId={user.customRoleId}
        roles={roleOptions}
        initialPermissions={user.permissions}
      />
    </div>
  )
}
