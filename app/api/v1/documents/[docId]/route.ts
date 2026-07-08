import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { deleteFromDrive } from '@/lib/integrations/google-drive'
import { getSignedFileUrl } from '@/lib/storage/gcs'
import { updateDocumentSchema } from '@/lib/validations/ownerDocument'

function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

// PATCH — update document metadata (issue/expiry/notes) in place.
export async function PATCH(req: NextRequest, { params }: { params: { docId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.ownerDocument.findUnique({ where: { id: params.docId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = updateDocumentSchema.safeParse({
      typeKey: clean(body.typeKey),
      fileUrl: clean(body.fileUrl),
      issueDate: clean(body.issueDate),
      expireDate: clean(body.expireDate),
      notes: clean(body.notes),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const doc = await db.ownerDocument.update({
      where: { id: params.docId },
      data: parsed.data,
      include: { type: true },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'owner_documents',
          recordId: doc.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] documents UPDATE', e))

    return NextResponse.json({ data: { ...doc, fileUrl: await getSignedFileUrl(doc.fileUrl) } })
  } catch (error) {
    console.error('[PATCH /api/v1/documents/:docId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove the document row and its Drive file (external links untouched).
// If a current version is deleted, promote the newest remaining version to current.
export async function DELETE(req: NextRequest, { params }: { params: { docId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.ownerDocument.findUnique({ where: { id: params.docId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.ownerDocument.delete({ where: { id: params.docId } })

    if (existing.driveFileId) {
      await deleteFromDrive(existing.driveFileId).catch((e) => console.error('[drive] delete', e))
    }

    // If we removed the current version, make the newest remaining one current.
    if (existing.isCurrent) {
      const next = await db.ownerDocument.findFirst({
        where: {
          typeKey: existing.typeKey,
          ownerId: existing.ownerId ?? undefined,
          guestyOwnerId: existing.guestyOwnerId ?? undefined,
          unitId: existing.unitId ?? undefined,
        },
        orderBy: { version: 'desc' },
      })
      if (next) await db.ownerDocument.update({ where: { id: next.id }, data: { isCurrent: true } })
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'owner_documents',
          recordId: existing.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] documents DELETE', e))

    return NextResponse.json({ data: { id: existing.id } })
  } catch (error) {
    console.error('[DELETE /api/v1/documents/:docId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
