import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getGcsPath, uploadFile, getSignedFileUrl } from '@/lib/storage/gcs'
import { createDocumentSchema } from '@/lib/validations/ownerDocument'

// Turn '' into undefined so optional/date fields don't fail coercion.
function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

// GET — all documents belonging to this owner: owner-scoped rows plus the docs
// of every unit the owner holds. File references are signed for reading.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const owner = await db.owner.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const documents = await db.ownerDocument.findMany({
      where: {
        OR: [{ ownerId: params.id }, { unit: { ownerUniqueId: params.id } }],
      },
      include: {
        type: true,
        unit: { select: { id: true, number: true, building: { select: { name: true } } } },
      },
      orderBy: [{ typeKey: 'asc' }, { createdAt: 'desc' }],
    })

    const data = await Promise.all(
      documents.map(async (d) => ({ ...d, fileUrl: await getSignedFileUrl(d.fileUrl) }))
    )

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/v1/owners/:id/documents]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a document for this owner (owner-scoped) or one of their units
// (unit-scoped, when unitId is provided). Accepts multipart/form-data with a
// `file` field (uploaded to GCS) or a JSON body with an external `fileUrl`.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const owner = await db.owner.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!owner) return NextResponse.json({ error: 'Not found' }, { status: 404 })

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
      for (const key of ['typeKey', 'unitId', 'issueDate', 'expireDate', 'notes', 'fileUrl']) {
        const v = form.get(key)
        if (typeof v === 'string') fields[key] = v
      }
    } else {
      Object.assign(fields, await req.json())
    }

    const unitId = clean(fields.unitId) ?? null
    const parsed = createDocumentSchema.safeParse({
      typeKey: clean(fields.typeKey),
      ownerId: unitId ? null : params.id,
      unitId,
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

    // Referential guards: type must exist; a unit-scoped doc must be on a unit
    // this owner actually holds.
    const type = await db.documentType.findUnique({ where: { key: parsed.data.typeKey } })
    if (!type) return NextResponse.json({ error: 'Unknown document type' }, { status: 400 })
    if (unitId) {
      const unit = await db.unit.findUnique({ where: { id: unitId }, select: { ownerUniqueId: true } })
      if (!unit || unit.ownerUniqueId !== params.id) {
        return NextResponse.json({ error: 'Unit does not belong to this owner' }, { status: 400 })
      }
    }

    // If a file was uploaded, store it and persist the GCS PATH (not the signed
    // URL, which expires). External fileUrls are stored verbatim.
    let fileUrl = parsed.data.fileUrl ?? null
    if (uploadBuffer) {
      const scope = unitId ? 'units' : 'owners'
      const scopeId = unitId ?? params.id
      const safeName = `${Date.now()}-${uploadName.replace(/[^\w.\-]/g, '_') || 'document'}`
      const path = getGcsPath(scope, scopeId, safeName)
      await uploadFile(uploadBuffer, path, uploadType)
      fileUrl = path
    }

    const doc = await db.ownerDocument.create({
      data: {
        typeKey: parsed.data.typeKey,
        ownerId: parsed.data.ownerId ?? null,
        unitId: parsed.data.unitId ?? null,
        fileUrl,
        issueDate: parsed.data.issueDate ?? null,
        expireDate: parsed.data.expireDate ?? null,
        notes: parsed.data.notes ?? null,
      },
      include: { type: true, unit: { select: { id: true, number: true } } },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'owner_documents',
          recordId: doc.id,
          newData: JSON.parse(JSON.stringify(doc)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] owner_documents CREATE', e))

    return NextResponse.json(
      { data: { ...doc, fileUrl: await getSignedFileUrl(doc.fileUrl) } },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/v1/owners/:id/documents]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
