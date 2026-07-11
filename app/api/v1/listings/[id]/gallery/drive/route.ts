import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getDriveFolderId } from '@/lib/image-utils'
import { listFolderImageFiles } from '@/lib/integrations/google-drive'

export const dynamic = 'force-dynamic'

// Lists the images in the attached unit's Drive folder so the user can pick which
// ones to add to the listing's curated photo set. Flags fileIds already added.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const listing = await db.listing.findUnique({
      where: { id: params.id },
      select: {
        photos: true,
        // A listing may span several units; use the first attached unit's Drive folder.
        unitListings: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { unit: { select: { driveFolderUrl: true } } },
        },
      },
    })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const folderUrl = listing.unitListings[0]?.unit?.driveFolderUrl ?? null
    if (!folderUrl) {
      return NextResponse.json({ data: { folder: false, images: [] } })
    }
    const folderId = getDriveFolderId(folderUrl)
    if (!folderId) {
      return NextResponse.json({ data: { folder: false, images: [], error: 'Unit Drive link is not a folder URL' } })
    }

    // Which Drive fileIds are already in the curated set.
    const added = new Set(
      (Array.isArray(listing.photos) ? listing.photos : [])
        .map((p) => (p && typeof p === 'object' ? (p as Record<string, unknown>) : null))
        .filter((p): p is Record<string, unknown> => !!p && p.kind === 'drive' && typeof p.src === 'string')
        .map((p) => p.src as string)
    )

    let files: Array<{ fileId: string; name: string }> = []
    try {
      files = await listFolderImageFiles(folderId)
    } catch (e) {
      console.error('[drive folder listing]', e)
      return NextResponse.json({ data: { folder: true, images: [], error: 'Could not read the Drive folder' } })
    }

    return NextResponse.json({
      data: {
        folder: true,
        images: files.map((f) => ({
          fileId: f.fileId,
          name: f.name,
          url: `/api/v1/drive/image/${f.fileId}`,
          added: added.has(f.fileId),
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/listings/:id/gallery/drive]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
