import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canDelete, canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { updateUnitSchema } from '@/lib/validations/unit'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const unit = await db.unit.findUnique({
      where: { id: params.id },
      include: {
        building: { select: { id: true, name: true, nickname: true, imageUrl: true } },
        owner: { select: { id: true, nickname: true, phone: true, email: true } },
        unitListings: { include: { listing: true }, orderBy: { listing: { name: 'asc' } } },
        _count: { select: { unitListings: true, contracts: true, inspections: true, tickets: true } },
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

    if (!(await canEdit(session, "data_master.units"))) {
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
    console.error('[PATCH /api/v1/units/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Permanent erase — gated by the Full permission (super admin, or a user
    // explicitly granted `full` on data_master.units).
    if (!(await canDelete(session, "data_master.units"))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.unit.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Hard delete in one transaction:
    //  - clear the dangling GuestyListing.unitId (bare column, no FK constraint)
    //  - delete UnitInspection rows (required FK → Restrict; the only blocker —
    //    their InspectionItems cascade)
    //  - delete the unit; remaining children cascade (owner docs, onboarding,
    //    document folders, file alerts) or set-null (listings, contracts, tickets)
    await db.$transaction([
      db.guestyListing.updateMany({ where: { unitId: params.id }, data: { unitId: null } }),
      db.unitInspection.deleteMany({ where: { unitId: params.id } }),
      db.unit.delete({ where: { id: params.id } }),
    ])

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        tableName: 'units',
        recordId: params.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] units DELETE', e))

    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/units/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
