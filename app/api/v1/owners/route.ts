import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createOwnerSchema } from '@/lib/validations/owner'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const owners = await db.owner.findMany({
      where: {
        ...(status ? { status: status as 'active' | 'inactive' | 'churned' } : {}),
        ...(search
          ? {
              OR: [
                { nickname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { uniqueId: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { units: true } } },
      orderBy: { nickname: 'asc' },
    })

    return NextResponse.json({ data: owners })
  } catch (error) {
    console.error('[GET /api/v1/owners]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createOwnerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const owner = await db.owner.create({ data: validated.data })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'owners',
        recordId: owner.id,
        newData: JSON.parse(JSON.stringify(owner)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    return NextResponse.json({ data: owner }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/owners]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
