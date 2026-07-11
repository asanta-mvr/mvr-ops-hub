import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireView, canEdit, isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { type UserRow } from '@/components/modules/settings/UserListTable'
import { type PendingInvitationRow } from '@/components/modules/settings/users/PendingInvitationsList'
import { UsersRolesTabs } from '@/components/modules/settings/UsersRolesTabs'
import { type RoleRow } from '@/components/modules/settings/RolesManager'

export const metadata: Metadata = { title: 'Settings · Users' }
export const dynamic = 'force-dynamic'

type Perm = { resource: string; level: string }

function asPerms(v: unknown): Perm[] {
  if (!Array.isArray(v)) return []
  return (v as unknown[])
    .filter((x): x is Perm => !!x && typeof x === 'object' && 'resource' in x && 'level' in x)
    .map((x) => ({ resource: String(x.resource), level: String(x.level) }))
}

// Order-independent signature of a permission set, for drift detection.
function permKey(perms: Perm[]): string {
  return perms.map((p) => `${p.resource}:${p.level}`).sort().join('|')
}

export default async function UsersListPage() {
  const session = await auth()
  await requireView(session, 'settings.users', '/no-access')
  const canEditUsers = await canEdit(session, 'settings.users')
  const viewerIsSuperAdmin = isSuperAdmin(session!.user.role)

  const now = new Date()
  const [users, invitations, roles] = await Promise.all([
    db.user.findMany({
      orderBy: [{ isActive: 'desc' }, { lastLoginAt: 'desc' }, { email: 'asc' }],
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        customRole: { select: { id: true, name: true, permissions: true } },
        permissions: { select: { resource: true, level: true } },
        _count: { select: { permissions: true } },
      },
    }),
    db.userInvitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        invitedBy: true,
        permissions: true,
        expiresAt: true,
        createdAt: true,
      },
    }),
    db.role.findMany({
      orderBy: [{ rank: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    }),
  ])

  const rows: UserRow[] = users.map((u) => {
    const rolePerms = u.customRole ? asPerms(u.customRole.permissions) : null
    const userPerms = u.permissions.map((p) => ({ resource: p.resource, level: p.level }))
    const customized = rolePerms !== null && permKey(rolePerms) !== permKey(userPerms)
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      image: u.image,
      role: u.role,
      roleName: u.customRole?.name ?? null,
      customized,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
      permissionCount: u._count.permissions,
    }
  })

  const roleRows: RoleRow[] = roles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    rank: r.rank,
    permissions: asPerms(r.permissions),
    userCount: r._count.users,
  }))

  const inviterIds = Array.from(new Set(invitations.map((i) => i.invitedBy)))
  const inviters = inviterIds.length
    ? await db.user.findMany({
        where: { id: { in: inviterIds } },
        select: { id: true, name: true, email: true },
      })
    : []
  const inviterMap = new Map(inviters.map((u) => [u.id, u] as const))

  const pendingRows: PendingInvitationRow[] = invitations.map((inv) => {
    const inviter = inviterMap.get(inv.invitedBy)
    const permsArr = Array.isArray(inv.permissions) ? (inv.permissions as unknown[]) : []
    return {
      id: inv.id,
      email: inv.email,
      name: inv.name,
      invitedByName: inviter?.name ?? inviter?.email ?? 'Unknown',
      invitedByEmail: inviter?.email ?? null,
      permissionCount: permsArr.length,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
    }
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Users &amp; Roles</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage who can sign in to MVR-OS, what each person can see, and the roles that preset access.
        </p>
      </div>

      <UsersRolesTabs
        users={rows}
        pending={pendingRows}
        roles={roleRows}
        canEdit={canEditUsers}
        viewerIsSuperAdmin={viewerIsSuperAdmin}
      />
    </div>
  )
}
