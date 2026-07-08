import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView, canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { fileAlertSchema, type FileAlertInput } from '@/lib/validations/alerts'

export const dynamic = 'force-dynamic'

// GET ?ownerId= | ?unitId= — active file alerts for one entity, with their type.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canView(session, 'data_master.owners'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const ownerId = req.nextUrl.searchParams.get('ownerId')
  const unitId = req.nextUrl.searchParams.get('unitId')
  if ((ownerId ? 1 : 0) + (unitId ? 1 : 0) !== 1) {
    return NextResponse.json({ error: 'Provide exactly one of ownerId or unitId' }, { status: 400 })
  }

  const alerts = await db.fileAlert.findMany({
    where: { ownerId: ownerId ?? undefined, unitId: unitId ?? undefined },
    include: { alertType: true, folder: { select: { id: true, name: true } } },
    orderBy: { expirationDate: 'asc' },
  })
  return NextResponse.json({ data: alerts })
}

// POST — apply an alert type to one file or, in bulk, to many. Body is either a
// single object or an array of objects (see fileAlertSchema).
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = fileAlertSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const items: FileAlertInput[] = Array.isArray(parsed.data) ? parsed.data : [parsed.data]

    // All items must reference existing folders and a real alert type.
    const folderIds = Array.from(new Set(items.map(i => i.folderId)))
    const alertTypeIds = Array.from(new Set(items.map(i => i.alertTypeId)))
    const [folders, types] = await Promise.all([
      db.documentFolder.findMany({ where: { id: { in: folderIds } }, select: { id: true } }),
      db.alertType.findMany({ where: { id: { in: alertTypeIds } }, select: { id: true } }),
    ])
    if (folders.length !== folderIds.length) {
      return NextResponse.json({ error: 'One or more folders not found' }, { status: 400 })
    }
    if (types.length !== alertTypeIds.length) {
      return NextResponse.json({ error: 'One or more alert types not found' }, { status: 400 })
    }

    const created = await db.$transaction(
      items.map(i =>
        db.fileAlert.create({
          data: {
            folderId: i.folderId,
            driveFileId: i.driveFileId,
            fileName: i.fileName,
            expirationDate: i.expirationDate,
            alertTypeId: i.alertTypeId,
            ownerId: i.ownerId ?? null,
            unitId: i.unitId ?? null,
          },
          include: { alertType: true, folder: { select: { id: true, name: true } } },
        })
      )
    )

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'file_alerts',
          recordId: created.map(c => c.id).join(','),
          newData: JSON.parse(JSON.stringify(created)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] file_alerts CREATE', e))

    return NextResponse.json({ data: created }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/file-alerts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
