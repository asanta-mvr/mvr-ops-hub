import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSignedImageUrl } from '@/lib/storage/gcs'
import { isDriveFolderUrl, getDriveFolderId } from '@/lib/image-utils'
import { listFolderImages } from '@/lib/integrations/google-drive'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const building = await db.building.findUnique({
    where: { id: params.id },
    select: { imageUrl: true },
  })

  if (!building) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const rawUrl = building.imageUrl
  let urls: string[] = []

  if (rawUrl) {
    if (isDriveFolderUrl(rawUrl)) {
      const folderId = getDriveFolderId(rawUrl)
      if (folderId) {
        urls = await listFolderImages(folderId).catch(() => [])
      }
    } else {
      const signed = await getSignedImageUrl(rawUrl)
      if (signed) urls = [signed]
    }
  }

  return NextResponse.json({ urls })
}
