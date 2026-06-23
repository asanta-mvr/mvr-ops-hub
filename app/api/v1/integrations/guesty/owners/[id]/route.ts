import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// Confirm/link to a Data Master Owner, or unlink (ownerUniqueId: null).
const mapSchema = z.object({
  ownerUniqueId: z.string().min(1).nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Mapping writes the Data Master Owner relation → gate on the owners resource.
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.guestyOwner.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Guesty owner not found' }, { status: 404 })

    const body = await req.json()
    const parsed = mapSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const { ownerUniqueId } = parsed.data

    // When linking, ensure the target Data Master Owner exists.
    if (ownerUniqueId) {
      const owner = await db.owner.findUnique({ where: { id: ownerUniqueId }, select: { id: true } })
      if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
    }

    const updated = await db.guestyOwner.update({
      where: { id: params.id },
      data: { ownerUniqueId, mappedAt: ownerUniqueId ? new Date() : null },
      select: {
        id: true,
        guestyId: true,
        ownerUniqueId: true,
        mappedAt: true,
        owner: { select: { id: true, nickname: true } },
      },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'guesty_owners',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify({ ownerUniqueId: existing.ownerUniqueId })) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify({ ownerUniqueId })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty owner map', e))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PATCH /api/v1/integrations/guesty/owners/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
