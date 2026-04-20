import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateBuildingSchema } from '@/lib/validations/building'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const building = await db.building.findUnique({
      where: { id: params.id },
      include: {
        city: { include: { state: { include: { country: true } } } },
        units: { orderBy: { number: 'asc' } },
        propertyManagers: { orderBy: { isPrimary: 'desc' } },
        _count: { select: { units: true, contracts: true } },
      },
    })

    if (!building) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: building })
  } catch (error) {
    console.error('[GET /api/v1/buildings/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateBuildingSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.building.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const building = await db.building.update({
      where: { id: params.id },
      data: validated.data,
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'buildings',
        recordId: building.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(building)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] buildings UPDATE', e))

    return NextResponse.json({ data: building })
  } catch (error) {
    console.error('[PATCH /api/v1/buildings/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.building.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const building = await db.building.update({
      where: { id: params.id },
      data: { status: 'inactive' },
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'buildings',
        recordId: building.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(building)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] buildings DELETE', e))

    return NextResponse.json({ data: { id: building.id, status: building.status } })
  } catch (error) {
    console.error('[DELETE /api/v1/buildings/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
