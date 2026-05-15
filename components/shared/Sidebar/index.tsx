// Server-side shell: computes the list of resource keys the current user can
// view, then hands them to the client component which handles all rendering
// (incl. active-route highlighting via usePathname).
import { auth } from '@/lib/auth'
import { getUserPermissions, isSuperAdmin } from '@/lib/auth/permissions'
import { RESOURCES } from '@/lib/auth/resources'
import { SidebarClient } from './SidebarClient'

export async function Sidebar() {
  const session = await auth()
  let allowedResources: string[] = []

  if (session?.user?.id) {
    if (isSuperAdmin(session.user.role)) {
      // super_admin sees every nav entry.
      allowedResources = RESOURCES.map((r) => r.key)
    } else {
      const perms = await getUserPermissions(session.user.id)
      allowedResources = Array.from(perms.keys())
    }
  }

  return <SidebarClient allowedResources={allowedResources} />
}
