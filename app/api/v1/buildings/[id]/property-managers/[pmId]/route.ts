import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { updatePropertyManagerSchema } from '@/lib/validations/property-manager'
import { syncEmergencyContacts } from '@/lib/utils/sync-contacts'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; pmId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.propertyManager.findFirst({
      where: { id: params.pmId, buildingId: params.id },
    })
    if (!existing) return NextResponse.json({ error: 'Property manager not found' }, { status: 404 })

    const body = await req.json()
    const validated = updatePropertyManagerSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 })
    }

    if (validated.data.isPrimary) {
      await db.propertyManager.updateMany({
        where: { buildingId: params.id, isPrimary: true, id: { not: params.pmId } },
        data: { isPrimary: false },
      })
    }

    const manager = await db.propertyManager.update({
      where: { id: params.pmId },
      data: validated.data,
    })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'property_managers',
        recordId: manager.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(manager)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    syncEmergencyContacts(params.id).catch((e) => console.error('[sync-contacts PATCH]', e))

    return NextResponse.json({ data: manager })
  } catch (error) {
    console.error('[PATCH /api/v1/buildings/:id/property-managers/:pmId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; pmId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.propertyManager.findFirst({
      where: { id: params.pmId, buildingId: params.id },
    })
    if (!existing) return NextResponse.json({ error: 'Property manager not found' }, { status: 404 })

    await db.propertyManager.delete({ where: { id: params.pmId } })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'property_managers',
        recordId: params.pmId,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    syncEmergencyContacts(params.id).catch((e) => console.error('[sync-contacts DELETE]', e))

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/buildings/:id/property-managers/:pmId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
