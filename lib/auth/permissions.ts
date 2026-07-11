// Centralized permission guards. Use these in server components, server
// actions, and API route handlers. Two main entry points:
//   - canView/canEdit  → boolean checks
//   - requireView/requireEdit  → redirect or 403 helpers
//
// super_admin always returns true (bypass). For anyone else, only the rows
// stored in `user_permissions` for that user count — no role-based fallback.
import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { Session } from 'next-auth'
import { db } from '@/lib/db'
import { isResource, levelSatisfies, LEVELS, type Level, type Resource } from './resources'

export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin'
}

// Cached per-request (React `cache`) so repeated guard calls in the same
// render don't hammer Postgres.
export const getUserPermissions = cache(
  async (userId: string): Promise<Map<Resource, Level>> => {
    const rows = await db.userPermission.findMany({
      where: { userId },
      select: { resource: true, level: true },
    })
    const map = new Map<Resource, Level>()
    for (const r of rows) {
      if (!isResource(r.resource)) continue
      if ((LEVELS as readonly string[]).includes(r.level)) {
        map.set(r.resource, r.level as Level)
      }
    }
    return map
  }
)

// True if the session user has any permission entry (even a single view).
// Used by `/no-access` to distinguish "pending setup" from "actually nothing".
export async function hasAnyAccess(session: Session | null | undefined): Promise<boolean> {
  if (!session?.user?.id) return false
  if (isSuperAdmin(session.user.role)) return true
  const perms = await getUserPermissions(session.user.id)
  return perms.size > 0
}

export async function canView(
  session: Session | null | undefined,
  resource: Resource
): Promise<boolean> {
  if (!session?.user?.id) return false
  if (isSuperAdmin(session.user.role)) return true
  const perms = await getUserPermissions(session.user.id)
  return levelSatisfies(perms.get(resource), 'view')
}

export async function canEdit(
  session: Session | null | undefined,
  resource: Resource
): Promise<boolean> {
  if (!session?.user?.id) return false
  if (isSuperAdmin(session.user.role)) return true
  const perms = await getUserPermissions(session.user.id)
  return levelSatisfies(perms.get(resource), 'edit')
}

// Permanent hard-delete ("Erase"). Super admins always pass; everyone else needs
// an explicit `delete` level (only super admins can grant it — see the users
// permissions route). Only meaningful for resources in ERASE_RESOURCES.
export async function canDelete(
  session: Session | null | undefined,
  resource: Resource
): Promise<boolean> {
  if (!session?.user?.id) return false
  if (isSuperAdmin(session.user.role)) return true
  const perms = await getUserPermissions(session.user.id)
  return levelSatisfies(perms.get(resource), 'delete')
}

// Redirect helpers for server components. Either go to /login (no session)
// or /no-access (no permission). The fallback URL overrides /no-access when
// the caller wants to land on the dashboard instead.
export async function requireView(
  session: Session | null | undefined,
  resource: Resource,
  fallback = '/no-access'
): Promise<void> {
  if (!session?.user) redirect('/login')
  if (!(await canView(session, resource))) redirect(fallback)
}

export async function requireEdit(
  session: Session | null | undefined,
  resource: Resource,
  fallback = '/no-access'
): Promise<void> {
  if (!session?.user) redirect('/login')
  if (!(await canEdit(session, resource))) redirect(fallback)
}

// Lightweight authz response helper for API route handlers.
export type AuthzFailure = { ok: false; status: 401 | 403; message: string }
export type AuthzSuccess = { ok: true }

export async function authzView(
  session: Session | null | undefined,
  resource: Resource
): Promise<AuthzFailure | AuthzSuccess> {
  if (!session?.user) return { ok: false, status: 401, message: 'Unauthorized' }
  if (!(await canView(session, resource))) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }
  return { ok: true }
}

export async function authzEdit(
  session: Session | null | undefined,
  resource: Resource
): Promise<AuthzFailure | AuthzSuccess> {
  if (!session?.user) return { ok: false, status: 401, message: 'Unauthorized' }
  if (!(await canEdit(session, resource))) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }
  return { ok: true }
}

export async function authzDelete(
  session: Session | null | undefined,
  resource: Resource
): Promise<AuthzFailure | AuthzSuccess> {
  if (!session?.user) return { ok: false, status: 401, message: 'Unauthorized' }
  if (!(await canDelete(session, resource))) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }
  return { ok: true }
}
