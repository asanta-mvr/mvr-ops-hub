import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireEdit } from '@/lib/auth/permissions'
import { InviteUserForm } from '@/components/modules/settings/users/InviteUserForm'

export const metadata: Metadata = { title: 'Settings · Invite user' }
export const dynamic = 'force-dynamic'

export default async function InviteUserPage() {
  const session = await auth()
  await requireEdit(session, 'settings.users', '/no-access')

  return <InviteUserForm />
}
