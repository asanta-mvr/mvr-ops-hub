import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { projectListingPhotos, type ListingPhoto } from '@/lib/integrations/guesty'

export const dynamic = 'force-dynamic'

// Coerce the stored Json into a typed, order-sorted ListingPhoto[].
function parsePhotos(json: unknown): ListingPhoto[] {
  if (!Array.isArray(json)) return []
  const out: ListingPhoto[] = []
  for (const p of json) {
    if (p && typeof p === 'object') {
      const r = p as Record<string, unknown>
      if (typeof r.id === 'string' && typeof r.src === 'string' && (r.kind === 'guesty' || r.kind === 'drive')) {
        out.push({ id: r.id, kind: r.kind, src: r.src, order: typeof r.order === 'number' ? r.order : 0 })
      }
    }
  }
  return out.sort((a, b) => a.order - b.order)
}

/** Display URL: Guesty CDN URL as-is; Drive fileId via the image proxy. */
function displayUrl(p: ListingPhoto): string {
  return p.kind === 'drive' ? `/api/v1/drive/image/${p.src}` : p.src
}

function toClient(photos: ListingPhoto[]) {
  return photos.map((p) => ({ id: p.id, kind: p.kind, url: displayUrl(p), order: p.order }))
}

function asJson(photos: ListingPhoto[]): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(photos)) as Prisma.InputJsonValue
}

const patchSchema = z.union([
  z.object({ op: z.literal('addFromDrive'), fileIds: z.array(z.string().min(1)).min(1).max(100) }),
  z.object({ op: z.literal('reorder'), orderedIds: z.array(z.string().min(1)).min(1) }),
  z.object({ op: z.literal('import') }),
])

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { photos: true } })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: toClient(parsePhotos(listing.photos)) })
  } catch (error) {
    console.error('[GET /api/v1/listings/:id/gallery]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const listing = await db.listing.findUnique({
      where: { id: params.id },
      select: { id: true, guestyId: true, photos: true },
    })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const parsed = patchSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    let photos = parsePhotos(listing.photos)

    if (parsed.data.op === 'addFromDrive') {
      const existing = new Set(photos.filter((p) => p.kind === 'drive').map((p) => p.src))
      let order = photos.reduce((m, p) => Math.max(m, p.order), -1)
      for (const fileId of parsed.data.fileIds) {
        if (existing.has(fileId)) continue
        existing.add(fileId)
        order += 1
        photos.push({ id: `d:${fileId}`, kind: 'drive', src: fileId, order })
      }
    } else if (parsed.data.op === 'reorder') {
      const byId = new Map(photos.map((p) => [p.id, p]))
      const reordered: ListingPhoto[] = []
      parsed.data.orderedIds.forEach((id, i) => {
        const p = byId.get(id)
        if (p) {
          reordered.push({ ...p, order: i })
          byId.delete(id)
        }
      })
      let i = reordered.length
      for (const p of Array.from(byId.values())) reordered.push({ ...p, order: i++ })
      photos = reordered
    } else if (parsed.data.op === 'import') {
      if (photos.length === 0 && listing.guestyId) {
        const src = await db.guestyListing.findUnique({ where: { guestyId: listing.guestyId }, select: { raw: true } })
        if (src) photos = projectListingPhotos(src.raw as Record<string, unknown>)
      }
    }

    await db.listing.update({ where: { id: params.id }, data: { photos: asJson(photos) } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'listings',
          recordId: params.id,
          newData: JSON.parse(JSON.stringify({ action: `photos:${parsed.data.op}`, count: photos.length })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] listing photos', e))

    return NextResponse.json({ data: toClient(photos) })
  } catch (error) {
    console.error('[PATCH /api/v1/listings/:id/gallery]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const photoId = req.nextUrl.searchParams.get('photoId')
    if (!photoId) return NextResponse.json({ error: 'photoId is required' }, { status: 400 })

    const listing = await db.listing.findUnique({ where: { id: params.id }, select: { photos: true } })
    if (!listing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Detach only — never deletes the underlying Drive file (company photo library).
    const photos = parsePhotos(listing.photos)
      .filter((p) => p.id !== photoId)
      .map((p, i) => ({ ...p, order: i }))

    await db.listing.update({ where: { id: params.id }, data: { photos: asJson(photos) } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'listings',
          recordId: params.id,
          newData: JSON.parse(JSON.stringify({ action: 'photos:detach', photoId, count: photos.length })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] listing photo detach', e))

    return NextResponse.json({ data: toClient(photos) })
  } catch (error) {
    console.error('[DELETE /api/v1/listings/:id/gallery]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
