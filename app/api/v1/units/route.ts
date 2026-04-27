import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createUnitSchema } from '@/lib/validations/unit'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const buildingId = searchParams.get('buildingId')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const where = {
      ...(buildingId ? { buildingId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { number: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    } as Prisma.UnitWhereInput

    const units = await db.unit.findMany({
      where,
      include: {
        building: { select: { id: true, name: true } },
        owner: { select: { id: true, nickname: true, uniqueId: true } },
        _count: { select: { listings: true } },
      },
      orderBy: [{ buildingId: 'asc' }, { number: 'asc' }],
    })

    return NextResponse.json({ data: units })
  } catch (error) {
    console.error('[GET /api/v1/units]', error)
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
    const validated = createUnitSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const unit = await db.unit.create({
      data: validated.data as Parameters<typeof db.unit.create>[0]['data'],
    })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'units',
        recordId: unit.id,
        newData: JSON.parse(JSON.stringify(unit)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    return NextResponse.json({ data: unit }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/units]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
