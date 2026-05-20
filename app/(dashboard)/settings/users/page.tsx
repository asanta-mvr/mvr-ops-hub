import type { Metadata } from 'next'
import Link from 'next/link'
import { UserPlus } from 'lucide-react'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { UserListTable, type UserRow } from '@/components/modules/settings/UserListTable'
import {
  PendingInvitationsList,
  type PendingInvitationRow,
} from '@/components/modules/settings/users/PendingInvitationsList'

export const metadata: Metadata = { title: 'Settings · Users' }
export const dynamic = 'force-dynamic'

export default async function UsersListPage() {
  const session = await auth()
  await requireView(session, 'settings.users', '/no-access')

  const now = new Date()
  const [users, invitations] = await Promise.all([
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
  ])

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    role: u.role,
    isActive: u.isActive,
    lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
    permissionCount: u._count.permissions,
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-mvr-primary">Users</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage who can sign in to MVR-OS and what each person can see.
          </p>
        </div>
        <Link
          href="/settings/users/invite"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Invite user
        </Link>
      </div>

      <PendingInvitationsList rows={pendingRows} />

      <UserListTable rows={rows} />
    </div>
  )
}
