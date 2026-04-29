import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { createPropertyManagerSchema } from '@/lib/validations/property-manager'
import { syncEmergencyContacts } from '@/lib/utils/sync-contacts'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const managers = await db.propertyManager.findMany({
      where: { buildingId: params.id },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json({ data: managers })
  } catch (error) {
    console.error('[GET /api/v1/buildings/:id/property-managers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const building = await db.building.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!building) return NextResponse.json({ error: 'Building not found' }, { status: 404 })

    const body = await req.json()
    const validated = createPropertyManagerSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 })
    }

    if (validated.data.isPrimary) {
      await db.propertyManager.updateMany({
        where: { buildingId: params.id, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    const manager = await db.propertyManager.create({
      data: { ...validated.data, buildingId: params.id },
    })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'property_managers',
        recordId: manager.id,
        newData: JSON.parse(JSON.stringify(manager)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    syncEmergencyContacts(params.id).catch((e) => console.error('[sync-contacts POST]', e))

    return NextResponse.json({ data: manager }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/buildings/:id/property-managers]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
