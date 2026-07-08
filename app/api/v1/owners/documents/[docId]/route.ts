import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getGcsPath, uploadFile, deleteFile, getSignedFileUrl } from '@/lib/storage/gcs'
import { updateDocumentSchema } from '@/lib/validations/ownerDocument'

function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

function isExternal(url: string | null): boolean {
  return !!url && (url.startsWith('http://') || url.startsWith('https://'))
}

// PATCH — update a document's metadata and optionally replace its file.
export async function PATCH(req: NextRequest, { params }: { params: { docId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.ownerDocument.findUnique({ where: { id: params.docId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const contentType = req.headers.get('content-type') ?? ''
    const fields: Record<string, unknown> = {}
    let uploadBuffer: Buffer | null = null
    let uploadName = ''
    let uploadType = 'application/octet-stream'

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const f = form.get('file')
      if (f instanceof File && f.size > 0) {
        uploadBuffer = Buffer.from(await f.arrayBuffer())
        uploadName = f.name
        uploadType = f.type || uploadType
      }
      for (const key of ['typeKey', 'fileUrl', 'issueDate', 'expireDate', 'notes']) {
        const v = form.get(key)
        if (typeof v === 'string') fields[key] = v
      }
    } else {
      Object.assign(fields, await req.json())
    }

    const parsed = updateDocumentSchema.safeParse({
      typeKey: clean(fields.typeKey),
      fileUrl: clean(fields.fileUrl),
      issueDate: clean(fields.issueDate),
      expireDate: clean(fields.expireDate),
      notes: clean(fields.notes),
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    if (parsed.data.typeKey) {
      const type = await db.documentType.findUnique({ where: { key: parsed.data.typeKey } })
      if (!type) return NextResponse.json({ error: 'Unknown document type' }, { status: 400 })
    }

    // Replace the file: upload the new one, then best-effort delete the old GCS
    // object (skip external URLs).
    const data: Prisma.OwnerDocumentUpdateInput = { ...parsed.data }
    if (uploadBuffer) {
      const scope = existing.unitId ? 'units' : 'owners'
      const scopeId = existing.unitId ?? existing.ownerId!
      const safeName = `${Date.now()}-${uploadName.replace(/[^\w.\-]/g, '_') || 'document'}`
      const path = getGcsPath(scope, scopeId, safeName)
      await uploadFile(uploadBuffer, path, uploadType)
      data.fileUrl = path
      if (existing.fileUrl && !isExternal(existing.fileUrl)) {
        await deleteFile(existing.fileUrl).catch((e) => console.error('[gcs] replace-delete', e))
      }
    }

    const doc = await db.ownerDocument.update({
      where: { id: params.docId },
      data,
      include: { type: true, unit: { select: { id: true, number: true } } },
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
      .catch((e) => console.error('[audit] owner_documents UPDATE', e))

    return NextResponse.json({ data: { ...doc, fileUrl: await getSignedFileUrl(doc.fileUrl) } })
  } catch (error) {
    console.error('[PATCH /api/v1/owners/documents/:docId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove the document row and its GCS object (external URLs left alone).
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

    if (existing.fileUrl && !isExternal(existing.fileUrl)) {
      await deleteFile(existing.fileUrl).catch((e) => console.error('[gcs] delete', e))
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
      .catch((e) => console.error('[audit] owner_documents DELETE', e))

    return NextResponse.json({ data: { id: existing.id } })
  } catch (error) {
    console.error('[DELETE /api/v1/owners/documents/:docId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
