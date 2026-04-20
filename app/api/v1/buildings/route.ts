import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createBuildingSchema } from '@/lib/validations/building'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const buildings = await db.building.findMany({
      where: {
        ...(status ? { status: status as 'active' | 'inactive' | 'onboarding' } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { nickname: { contains: search, mode: 'insensitive' } },
                { address: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        city: { include: { state: { include: { country: true } } } },
        _count: { select: { units: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ data: buildings })
  } catch (error) {
    console.error('[GET /api/v1/buildings]', error)
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
    const validated = createBuildingSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const building = await db.building.create({ data: validated.data })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'buildings',
        recordId: building.id,
        newData: JSON.parse(JSON.stringify(building)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] buildings CREATE', e))

    return NextResponse.json({ data: building }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/buildings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
