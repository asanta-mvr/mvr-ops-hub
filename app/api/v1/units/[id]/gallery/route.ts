import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { isDriveFolderUrl, getDriveFolderId } from '@/lib/image-utils'
import { listFolderImages } from '@/lib/integrations/google-drive'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unit = await db.unit.findUnique({
    where:  { id: params.id },
    select: { driveFolderUrl: true },
  })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let urls: string[] = []

  if (unit.driveFolderUrl && isDriveFolderUrl(unit.driveFolderUrl)) {
    const folderId = getDriveFolderId(unit.driveFolderUrl)
    if (folderId) urls = await listFolderImages(folderId).catch(() => [])
  }

  return NextResponse.json({ urls })
}
