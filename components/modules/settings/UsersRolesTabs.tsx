'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, Users as UsersIcon, ShieldCheck } from 'lucide-react'
import { UserListTable, type UserRow } from '@/components/modules/settings/UserListTable'
import {
  PendingInvitationsList,
  type PendingInvitationRow,
} from '@/components/modules/settings/users/PendingInvitationsList'
import { RolesManager, type RoleRow } from '@/components/modules/settings/RolesManager'

interface Props {
  users: UserRow[]
  pending: PendingInvitationRow[]
  roles: RoleRow[]
  canEdit: boolean
  viewerIsSuperAdmin: boolean
}

type Tab = 'users' | 'roles'

export function UsersRolesTabs({ users, pending, roles, canEdit, viewerIsSuperAdmin }: Props) {
  const [tab, setTab] = useState<Tab>('users')

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-4 py-2 transition-colors ${
      active ? 'bg-mvr-primary text-white font-semibold' : 'text-mvr-primary hover:bg-mvr-cream'
    }`

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-white overflow-hidden text-sm">
          <button type="button" onClick={() => setTab('users')} className={tabClass(tab === 'users')}>
            <UsersIcon className="w-4 h-4" /> Users
          </button>
          <button type="button" onClick={() => setTab('roles')} className={tabClass(tab === 'roles')}>
            <ShieldCheck className="w-4 h-4" /> Roles
          </button>
        </div>

        {tab === 'users' && canEdit && (
          <Link
            href="/settings/users/invite"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite user
          </Link>
        )}
      </div>

      {tab === 'users' ? (
        <div className="space-y-5">
          <PendingInvitationsList rows={pending} />
          <UserListTable rows={users} />
        </div>
      ) : (
        <RolesManager roles={roles} canEdit={canEdit} viewerIsSuperAdmin={viewerIsSuperAdmin} />
      )}
    </div>
  )
}
