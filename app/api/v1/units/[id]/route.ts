import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateUnitSchema } from '@/lib/validations/unit'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const unit = await db.unit.findUnique({
      where: { id: params.id },
      include: {
        building: { select: { id: true, name: true, nickname: true, imageUrl: true } },
        owner: { select: { id: true, uniqueId: true, nickname: true, phone: true, email: true } },
        listings: { orderBy: { name: 'asc' } },
        _count: { select: { listings: true, contracts: true, inspections: true, tickets: true } },
      },
    })

    if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: unit })
  } catch (error) {
    console.error('[GET /api/v1/units/:id]', error)
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
    const validated = updateUnitSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.unit.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const unit = await db.unit.update({
      where: { id: params.id },
      data: validated.data as Parameters<typeof db.unit.update>[0]['data'],
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'units',
        recordId: unit.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(unit)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] units UPDATE', e))

    return NextResponse.json({ data: unit })
  } catch (error) {
    console.error('[PATCH /api/v1/units/:id]', error)
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

    const existing = await db.unit.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const unit = await db.unit.update({
      where: { id: params.id },
      data: { status: 'inactive' },
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'units',
        recordId: unit.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(unit)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] units DELETE', e))

    return NextResponse.json({ data: { id: unit.id, status: unit.status } })
  } catch (error) {
    console.error('[DELETE /api/v1/units/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
