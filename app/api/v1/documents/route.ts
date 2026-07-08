import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { uploadFileToFolder } from '@/lib/integrations/google-drive'
import { getSignedFileUrl } from '@/lib/storage/gcs'
import { renderDocumentName } from '@/lib/owners/documentNaming'
import { createDocumentSchema } from '@/lib/validations/ownerDocument'

function clean(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

function extOf(name: string): string {
  const m = name.match(/\.([A-Za-z0-9]{1,8})$/)
  return m ? `.${m[1].toLowerCase()}` : ''
}

// POST — create a document (versioned) for exactly one of owner / legal owner
// (Guesty account) / unit. Accepts multipart (file → Google Drive) or a JSON
// body with an external `fileUrl`.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      for (const key of ['typeKey', 'ownerId', 'guestyOwnerId', 'unitId', 'fileUrl', 'issueDate', 'expireDate', 'notes', 'label']) {
        const v = form.get(key)
        if (typeof v === 'string') fields[key] = v
      }
    } else {
      Object.assign(fields, await req.json())
    }

    const parsed = createDocumentSchema.safeParse({
      typeKey: clean(fields.typeKey),
      ownerId: clean(fields.ownerId) ?? null,
      guestyOwnerId: clean(fields.guestyOwnerId) ?? null,
      unitId: clean(fields.unitId) ?? null,
      fileUrl: clean(fields.fileUrl),
      issueDate: clean(fields.issueDate),
      expireDate: clean(fields.expireDate),
      notes: clean(fields.notes),
      label: clean(fields.label),
    })
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const { typeKey, ownerId, guestyOwnerId, unitId } = parsed.data

    const type = await db.documentType.findUnique({ where: { key: typeKey } })
    if (!type) return NextResponse.json({ error: 'Unknown document type' }, { status: 400 })

    // Verify the provided target matches the type's scope, and resolve the Drive
    // folder its documents upload into (set by the user via the card's folder
    // icon) plus the naming context for that entity.
    let folderId: string | null = null
    const naming: { type: string; owner?: string; legalOwner?: string; unit?: string; building?: string } = { type: type.label }

    if (type.scope === 'owner') {
      if (!ownerId) return NextResponse.json({ error: 'This document type attaches to an owner' }, { status: 400 })
      const owner = await db.owner.findUnique({ where: { id: ownerId }, select: { nickname: true, driveFolderId: true } })
      if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
      folderId = owner.driveFolderId
      naming.owner = owner.nickname
    } else if (type.scope === 'legal_owner') {
      if (!guestyOwnerId) return NextResponse.json({ error: 'This document type attaches to a legal owner' }, { status: 400 })
      const lo = await db.guestyOwner.findUnique({
        where: { id: guestyOwnerId },
        select: { fullName: true, guestyId: true, driveFolderId: true, owner: { select: { nickname: true } } },
      })
      if (!lo) return NextResponse.json({ error: 'Legal owner not found' }, { status: 400 })
      folderId = lo.driveFolderId
      naming.owner = lo.owner?.nickname ?? undefined
      naming.legalOwner = lo.fullName || lo.guestyId
    } else {
      if (!unitId) return NextResponse.json({ error: 'This document type attaches to a unit' }, { status: 400 })
      const unit = await db.unit.findUnique({
        where: { id: unitId },
        select: { number: true, driveFolderId: true, building: { select: { name: true, nickname: true } } },
      })
      if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 400 })
      folderId = unit.driveFolderId
      naming.unit = unit.number
      naming.building = unit.building.nickname || unit.building.name
    }

    // Versioning: next version for this (type, target); flip prior current off.
    const targetWhere: Prisma.OwnerDocumentWhereInput = {
      typeKey,
      ownerId: ownerId ?? undefined,
      guestyOwnerId: guestyOwnerId ?? undefined,
      unitId: unitId ?? undefined,
    }
    const prior = await db.ownerDocument.findFirst({ where: targetWhere, orderBy: { version: 'desc' }, select: { version: true } })
    const version = (prior?.version ?? 0) + 1

    // Store the file: upload into the card's assigned Drive folder (naming
    // template) or keep the external link.
    let fileUrl = parsed.data.fileUrl ?? null
    let driveFileId: string | null = null
    if (uploadBuffer) {
      if (!folderId) {
        return NextResponse.json(
          { error: 'Attach a Google Drive folder to this section (folder icon) before uploading a file.' },
          { status: 400 }
        )
      }
      const base = renderDocumentName(type.namingTemplate, {
        type: naming.type,
        owner: naming.owner ?? null,
        legalOwner: naming.legalOwner ?? null,
        unit: naming.unit ?? null,
        building: naming.building ?? null,
        issueDate: parsed.data.issueDate ?? null,
        expiryDate: parsed.data.expireDate ?? null,
        version,
      })
      try {
        const uploaded = await uploadFileToFolder(uploadBuffer, `${base}${extOf(uploadName)}`, uploadType, folderId)
        fileUrl = uploaded.webViewLink
        driveFileId = uploaded.fileId
      } catch (err) {
        const status = (err as { code?: number })?.code
        if (status === 404 || status === 403) {
          return NextResponse.json(
            { error: "Can't write to that Drive folder. Share it with the app's service account as Editor (see the folder icon hint), then try again." },
            { status: 502 }
          )
        }
        throw err
      }
    }

    if (version > 1) {
      await db.ownerDocument.updateMany({ where: { ...targetWhere, isCurrent: true }, data: { isCurrent: false } })
    }

    const doc = await db.ownerDocument.create({
      data: {
        typeKey,
        ownerId: ownerId ?? null,
        guestyOwnerId: guestyOwnerId ?? null,
        unitId: unitId ?? null,
        fileUrl,
        driveFileId,
        issueDate: parsed.data.issueDate ?? null,
        expireDate: parsed.data.expireDate ?? null,
        notes: parsed.data.notes ?? null,
        label: parsed.data.label ?? null,
        version,
        isCurrent: true,
      },
      include: { type: true },
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
      .catch((e) => console.error('[audit] documents CREATE', e))

    return NextResponse.json({ data: { ...doc, fileUrl: await getSignedFileUrl(doc.fileUrl) } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/documents]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
