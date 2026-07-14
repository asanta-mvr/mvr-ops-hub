import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

// Detach an option from the list. Buildings already using its label keep that
// value (Building.zone is free text) — this only removes the selectable option.
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, 'data_master.buildings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.buildingFieldOption.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.buildingFieldOption.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'building_field_options',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] building_field_options DELETE', e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/v1/building-options/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
