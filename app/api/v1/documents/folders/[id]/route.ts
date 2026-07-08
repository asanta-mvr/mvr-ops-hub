import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

// DELETE — detach a named Drive folder (and cascade its file alerts). The Drive
// folder itself is untouched; we only drop our link to it.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.documentFolder.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    await db.documentFolder.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'document_folders',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] document_folders DELETE', e))

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/v1/documents/folders/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
