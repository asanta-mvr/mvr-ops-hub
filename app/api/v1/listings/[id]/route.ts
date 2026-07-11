import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { updateListingSchema } from '@/lib/validations/listing'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const listing = await db.listing.findUnique({
      where: { id: params.id },
      include: {
        unitListings: {
          orderBy: { createdAt: 'asc' },
          select: { unit: { select: { id: true, number: true, building: { select: { name: true } } } } },
        },
      },
    })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: listing })
  } catch (error) {
    console.error('[GET /api/v1/listings/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.listing.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const validated = updateListingSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json({ error: 'Validation failed', details: validated.error.flatten() }, { status: 400 })
    }

    // Attaching/detaching a unit now lives on the unit side
    // (POST/DELETE /api/v1/units/:id/listings) — a listing may span many units.
    const data: Prisma.ListingUpdateInput = { ...validated.data }
    for (const key of ['urlAirbnb', 'urlBooking', 'urlVrbo', 'urlExpedia', 'urlVacasa'] as const) {
      if (data[key] === '') data[key] = null
    }

    const listing = await db.listing.update({ where: { id: params.id }, data })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'listings',
          recordId: listing.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(listing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] listings UPDATE', e))

    return NextResponse.json({ data: listing })
  } catch (error) {
    console.error('[PATCH /api/v1/listings/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
