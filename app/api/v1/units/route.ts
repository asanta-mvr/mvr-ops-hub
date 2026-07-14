import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { createUnitSchema } from '@/lib/validations/unit'

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
        owner: { select: { id: true, nickname: true } },
        _count: { select: { unitListings: true } },
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

    if (!(await canEdit(session, "data_master.units"))) {
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

    // Confirm the referenced building exists (building ids are 8-char hex, not
    // cuids), returning a field-level error instead of a raw FK failure.
    const building = await db.building.findUnique({
      where: { id: validated.data.buildingId },
      select: { id: true },
    })
    if (!building) {
      return NextResponse.json(
        { error: 'Validation failed', details: { formErrors: [], fieldErrors: { buildingId: ['Invalid building ID'] } } },
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
    // Duplicate (buildingId, number) → clean field error instead of a 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: { formErrors: [], fieldErrors: { number: ['A unit with this number already exists in this building'] } },
        },
        { status: 409 }
      )
    }
    console.error('[POST /api/v1/units]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
