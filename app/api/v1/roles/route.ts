import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { roleSchema } from '@/lib/auth/schemas'

export const dynamic = 'force-dynamic'

// Roles (permission presets) are managed by anyone who can edit user management.
// Including a `full` level in a role is restricted to super admins, mirroring
// the per-user permission rules.
function containsFull(perms: Array<{ level: string }>): boolean {
  return perms.some((p) => p.level === 'full')
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const roles = await db.role.findMany({
      orderBy: [{ rank: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { users: true } } },
    })
    return NextResponse.json({ data: roles })
  } catch (error) {
    console.error('[GET /api/v1/roles]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
        { error: 'Only super admins can create roles with Full access.' },
        { status: 403 }
      )
    }

    let role
    try {
      role = await db.role.create({
        data: {
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          rank: parsed.data.rank ?? 0,
          permissions: parsed.data.permissions as unknown as Prisma.InputJsonValue,
          createdBy: session.user.id,
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
          action: 'CREATE',
          tableName: 'roles',
          recordId: role.id,
          newData: JSON.parse(JSON.stringify(role)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] roles CREATE', e))

    return NextResponse.json({ data: role })
  } catch (error) {
    console.error('[POST /api/v1/roles]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
