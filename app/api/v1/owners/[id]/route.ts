import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { updateOwnerSchema } from '@/lib/validations/owner'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owner = await db.owner.findUnique({
      where: { id: params.id },
      include: {
        units: {
          include: { building: { select: { id: true, name: true, nickname: true } } },
          orderBy: { number: 'asc' },
        },
        _count: { select: { units: true, contracts: true } },
      },
    })

    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: owner })
  } catch (error) {
    console.error('[GET /api/v1/owners/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, "data_master.owners"))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateOwnerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.owner.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Stamp (or clear) the deactivation date when status transitions.
    const data: Prisma.OwnerUpdateInput = { ...validated.data }
    if (validated.data.status && validated.data.status !== existing.status) {
      data.inactivatedAt = validated.data.status === 'inactive' ? new Date() : null
    }

    // Keep the combined display name in sync when either name part changes.
    if (validated.data.firstName !== undefined || validated.data.lastName !== undefined) {
      const fn = validated.data.firstName ?? existing.firstName ?? ''
      const ln = validated.data.lastName ?? existing.lastName ?? ''
      const combined = [fn, ln].filter(Boolean).join(' ').trim()
      if (combined) data.nickname = combined
    }

    const owner = await db.owner.update({
      where: { id: params.id },
      data,
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        tableName: 'owners',
        recordId: owner.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(owner)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] owners UPDATE', e))

    return NextResponse.json({ data: owner })
  } catch (error) {
    console.error('[PATCH /api/v1/owners/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, "data_master.owners"))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.owner.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const owner = await db.owner.update({
      where: { id: params.id },
      data: { status: 'inactive', inactivatedAt: existing.inactivatedAt ?? new Date() },
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'owners',
        recordId: owner.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(owner)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] owners DELETE', e))

    return NextResponse.json({ data: { id: owner.id, status: owner.status } })
  } catch (error) {
    console.error('[DELETE /api/v1/owners/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
