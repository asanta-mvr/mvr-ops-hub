import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { uploadFileToFolder } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

// POST (multipart `file`) — upload a file into this named folder's Drive folder.
// The Drive folder must be shared with the app's service account as Editor.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const folder = await db.documentFolder.findUnique({ where: { id: params.id } })
    if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 })

    const form = await req.formData()
    const f = form.get('file')
    if (!(f instanceof File) || f.size === 0) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    const buffer = Buffer.from(await f.arrayBuffer())
    const mimeType = f.type || 'application/octet-stream'

    let uploaded: { fileId: string; webViewLink: string }
    try {
      uploaded = await uploadFileToFolder(buffer, f.name, mimeType, folder.driveFolderId)
    } catch (err) {
      const status = (err as { code?: number })?.code
      if (status === 404 || status === 403) {
        return NextResponse.json(
          { error: "Can't write to that Drive folder. Share it with the app's service account as Editor, then try again." },
          { status: 502 }
        )
      }
      throw err
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'document_folders',
          recordId: folder.id,
          newData: JSON.parse(JSON.stringify({ folderId: folder.id, ...uploaded, name: f.name })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] folder upload', e))

    return NextResponse.json({ data: uploaded }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/documents/folders/:id/upload]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
