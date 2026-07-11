import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const attachSchema = z.object({ listingId: z.string().min(1) })

// POST — attach a listing to this unit (idempotent). A listing may be attached
// to multiple units (combined listings), so this only creates the join row.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = attachSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { listingId } = parsed.data

    const [unit, listing] = await Promise.all([
      db.unit.findUnique({ where: { id: params.id }, select: { id: true } }),
      db.listing.findUnique({ where: { id: listingId }, select: { id: true } }),
    ])
    if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    // Idempotent: composite PK means a duplicate attach is a no-op.
    await db.unitListing.upsert({
      where: { unitId_listingId: { unitId: params.id, listingId } },
      create: { unitId: params.id, listingId },
      update: {},
    })

    db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'unit_listings',
        recordId: `${params.id}:${listingId}`,
        newData: { unitId: params.id, listingId } as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] unit_listings CREATE', e))

    return NextResponse.json({ data: { unitId: params.id, listingId, attached: true } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/units/:id/listings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
