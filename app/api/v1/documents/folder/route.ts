import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getDriveFolderId, isDriveFolderUrl } from '@/lib/image-utils'

const bodySchema = z.object({
  ownerId: z.string().optional().nullable(),
  guestyOwnerId: z.string().optional().nullable(),
  unitId: z.string().optional().nullable(),
  folderUrl: z.string().max(2000).optional().nullable(), // empty/null clears it
})

// PATCH — set (or clear) the Google Drive folder that a card's documents upload
// into. Accepts a folder URL; the folder id is extracted and stored on the
// owner / legal owner (Guesty account) / unit.
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = bodySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const { ownerId, guestyOwnerId, unitId, folderUrl } = parsed.data

    const targets = [ownerId, guestyOwnerId, unitId].filter(Boolean)
    if (targets.length !== 1) {
      return NextResponse.json({ error: 'Provide exactly one of owner, legal owner, or unit' }, { status: 400 })
    }

    let folderId: string | null = null
    if (folderUrl && folderUrl.trim()) {
      if (!isDriveFolderUrl(folderUrl)) {
        return NextResponse.json({ error: 'Paste a Google Drive folder link (…/drive/folders/…).' }, { status: 400 })
      }
      folderId = getDriveFolderId(folderUrl)
      if (!folderId) {
        return NextResponse.json({ error: 'Could not read the folder id from that link.' }, { status: 400 })
      }
    }

    if (ownerId) {
      await db.owner.update({ where: { id: ownerId }, data: { driveFolderId: folderId } })
    } else if (guestyOwnerId) {
      await db.guestyOwner.update({ where: { id: guestyOwnerId }, data: { driveFolderId: folderId } })
    } else if (unitId) {
      await db.unit.update({
        where: { id: unitId },
        data: { driveFolderId: folderId, driveFolderUrl: folderId ? folderUrl : null },
      })
    }

    return NextResponse.json({ data: { folderId } })
  } catch (error) {
    console.error('[PATCH /api/v1/documents/folder]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
