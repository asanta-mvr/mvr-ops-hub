import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { updatePermissionsSchema } from '@/lib/auth/schemas'

export const dynamic = 'force-dynamic'

// Replaces the user's entire permission set with the provided list. Any
// resource not in the body is removed; any new resource is created. This
// keeps the request body and DB state symmetric.
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = updatePermissionsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const targetUser = await db.user.findUnique({ where: { id: params.id } })
    if (!targetUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Don't allow the admin to wipe their own permissions accidentally — they
    // would lose access to /settings/users itself. super_admin role bypasses
    // the matrix anyway, so this is a soft guard for non-super admins.
    if (params.id === session.user.id && session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You cannot edit your own permissions' },
        { status: 400 }
      )
    }

    const oldPermissions = await db.userPermission.findMany({
      where: { userId: params.id },
      select: { resource: true, level: true },
    })

    // Only super admins may grant, remove, or change an Erase (delete) grant.
    // Non-super-admins can still edit other levels as long as they leave any
    // existing erase grant untouched.
    if (!isSuperAdmin(session.user.role)) {
      const oldLevel = new Map(oldPermissions.map((p) => [p.resource, p.level] as const))
      const newLevel = new Map(parsed.data.permissions.map((p) => [p.resource, p.level] as const))
      const resources = Array.from(
        new Set(
          oldPermissions
            .map((p) => p.resource)
            .concat(parsed.data.permissions.map((p) => p.resource))
        )
      )
      for (const resource of resources) {
        const was = oldLevel.get(resource)
        const now = newLevel.get(resource)
        if ((was === 'delete' || now === 'delete') && was !== now) {
          return NextResponse.json(
            { error: 'Only super admins can grant or change Erase permissions.' },
            { status: 403 }
          )
        }
      }
    }

    // Atomic replace: delete all then insert the new set.
    await db.$transaction([
      db.userPermission.deleteMany({ where: { userId: params.id } }),
      ...(parsed.data.permissions.length > 0
        ? [
            db.userPermission.createMany({
              data: parsed.data.permissions.map((p) => ({
                userId: params.id,
                resource: p.resource,
                level: p.level,
                createdBy: session.user.id,
              })),
            }),
          ]
        : []),
    ])

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'user_permissions',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(oldPermissions)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(parsed.data.permissions)) as Prisma.InputJsonValue,
          ipAddress:
            req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] user_permissions UPDATE', e))

    return NextResponse.json({ data: parsed.data.permissions })
  } catch (error) {
    console.error('[PUT /api/v1/users/:id/permissions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
