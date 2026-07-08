import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const patchSchema = z.object({ expirationDate: z.coerce.date() })

// PATCH — update a file alert's expiration date. The Documents table edits one
// shared expiry per file by PATCHing each of that file's alerts.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.fileAlert.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'File alert not found' }, { status: 404 })

    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const updated = await db.fileAlert.update({
      where: { id: params.id },
      data: { expirationDate: parsed.data.expirationDate },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'file_alerts',
          recordId: updated.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] file_alerts UPDATE', e))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PATCH /api/v1/file-alerts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a single file alert.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.fileAlert.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'File alert not found' }, { status: 404 })

    await db.fileAlert.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'file_alerts',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] file_alerts DELETE', e))

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/v1/file-alerts/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
