import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { listFolderFiles } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

// Google Drive file/folder ids are URL-safe base64-ish; reject anything else so
// the id can't break out of the Drive query string.
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,120}$/

// GET — list the files inside a Drive folder so a document card can preview
// what's already there. Guards: valid id format, view permission, and the folder
// must actually be linked to a record the user can see (no arbitrary folders).
export async function GET(_req: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const folderId = params.folderId
    if (!DRIVE_ID_RE.test(folderId)) {
      return NextResponse.json({ error: 'Invalid folder id' }, { status: 400 })
    }

    // Only folders our app has linked may be listed: the legacy single-folder
    // fields (owner / legal owner / unit) or a named DocumentFolder attachment.
    const [ownerLinked, legalLinked, unitLinked, namedLinked] = await Promise.all([
      db.owner.findFirst({ where: { driveFolderId: folderId }, select: { id: true } }),
      db.guestyOwner.findFirst({ where: { driveFolderId: folderId }, select: { id: true } }),
      db.unit.findFirst({ where: { driveFolderId: folderId }, select: { id: true } }),
      db.documentFolder.findFirst({ where: { driveFolderId: folderId }, select: { id: true } }),
    ])
    if (!ownerLinked && !legalLinked && !unitLinked && !namedLinked) {
      return NextResponse.json({ error: 'Folder is not linked to any record' }, { status: 403 })
    }

    const files = await listFolderFiles(folderId)
    return NextResponse.json({ data: files })
  } catch (error) {
    console.error('[GET /api/v1/drive/folder/:folderId]', error)
    return NextResponse.json({ data: [] })
  }
}
