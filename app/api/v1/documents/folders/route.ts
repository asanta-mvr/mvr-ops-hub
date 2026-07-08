import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getDriveFolderId } from '@/lib/image-utils'
import { createFolderSchema } from '@/lib/validations/documentFolder'

// POST — attach a named Google Drive folder to an owner or unit. The user pastes
// a full Drive folder URL; we extract and store the folder id.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = createFolderSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const { name, folderUrl, ownerId, unitId } = parsed.data

    const driveFolderId = getDriveFolderId(folderUrl)
    if (!driveFolderId) {
      return NextResponse.json(
        { error: 'Paste a Google Drive folder link (e.g. https://drive.google.com/drive/folders/…).' },
        { status: 400 }
      )
    }

    // Verify the target entity exists before creating the attachment.
    if (ownerId) {
      const owner = await db.owner.findUnique({ where: { id: ownerId }, select: { id: true } })
      if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
    } else if (unitId) {
      const unit = await db.unit.findUnique({ where: { id: unitId }, select: { id: true } })
      if (!unit) return NextResponse.json({ error: 'Unit not found' }, { status: 400 })
    }

    const folder = await db.documentFolder.create({
      data: { name, driveFolderId, ownerId: ownerId ?? null, unitId: unitId ?? null },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'document_folders',
          recordId: folder.id,
          newData: JSON.parse(JSON.stringify(folder)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] document_folders CREATE', e))

    return NextResponse.json({ data: folder }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/documents/folders]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
