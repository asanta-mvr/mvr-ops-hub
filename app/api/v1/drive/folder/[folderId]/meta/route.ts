import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { getDriveFolderName } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

const DRIVE_ID_RE = /^[A-Za-z0-9_-]{10,120}$/

// GET — the display name of a Drive folder, used to pre-fill the folder-name
// field when a user pastes a folder link (before it's attached to any record).
// Gated to editors since it reads folder metadata the service account can see.
export async function GET(_req: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!DRIVE_ID_RE.test(params.folderId)) {
      return NextResponse.json({ error: 'Invalid folder id' }, { status: 400 })
    }

    const name = await getDriveFolderName(params.folderId)
    return NextResponse.json({ data: { name } })
  } catch (error) {
    console.error('[GET /api/v1/drive/folder/:folderId/meta]', error)
    return NextResponse.json({ data: { name: null } })
  }
}
