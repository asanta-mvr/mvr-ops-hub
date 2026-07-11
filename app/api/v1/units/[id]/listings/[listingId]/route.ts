import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

// DELETE — detach a listing from this unit (remove the join row). Idempotent.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; listingId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { count } = await db.unitListing.deleteMany({
      where: { unitId: params.id, listingId: params.listingId },
    })

    if (count > 0) {
      db.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'unit_listings',
          recordId: `${params.id}:${params.listingId}`,
          oldData: { unitId: params.id, listingId: params.listingId } as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      }).catch((e) => console.error('[audit] unit_listings DELETE', e))
    }

    return NextResponse.json({ data: { unitId: params.id, listingId: params.listingId, detached: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/units/:id/listings/:listingId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
