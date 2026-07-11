import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { roleSchema } from '@/lib/auth/schemas'

export const dynamic = 'force-dynamic'

function containsFull(perms: Array<{ level: string }>): boolean {
  return perms.some((p) => p.level === 'full')
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.role.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = roleSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    if (containsFull(parsed.data.permissions) && !isSuperAdmin(session.user.role)) {
      return NextResponse.json(
        { error: 'Only super admins can save roles with Full access.' },
        { status: 403 }
      )
    }

    let role
    try {
      role = await db.role.update({
        where: { id: params.id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          rank: parsed.data.rank ?? 0,
          permissions: parsed.data.permissions as unknown as Prisma.InputJsonValue,
        },
      })
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json({ error: 'A role with that name already exists.' }, { status: 409 })
      }
      throw e
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'roles',
          recordId: role.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(role)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] roles UPDATE', e))

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('[PUT /api/v1/roles/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.role.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Deleting a role unassigns it from users (User.customRoleId -> null via
    // onDelete: SetNull). Users keep their already-copied permissions.
    await db.role.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'roles',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] roles DELETE', e))

    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/roles/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
