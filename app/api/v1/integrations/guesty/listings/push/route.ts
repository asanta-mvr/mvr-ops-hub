import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { projectListingToDataMaster, projectListingPhotos } from '@/lib/integrations/guesty'

// Pushing many listings runs many upserts — give it room.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const UPSERT_CHUNK = 25

// Either an explicit set of GuestyListing ids, OR the active table filters
// (status / mapped / search) so "select all matching" can push beyond one page.
const pushSchema = z.object({
  guestyListingIds: z.array(z.string().min(1)).min(1).max(2000).optional(),
  filter: z
    .object({
      q: z.string().optional(),
      status: z.enum(['active', 'inactive']).optional(),
      mapped: z.enum(['mapped', 'unmapped']).optional(),
    })
    .optional(),
})

/**
 * Promote selected synced listings into Data Master → Listings. Creates (or
 * UPDATES) a `Listing` per source `GuestyListing`, keyed on the stable Guesty
 * id so re-pushing the same listing updates its record rather than duplicating.
 * Projects editable fields from the already-stored `raw` payload — no new Guesty
 * API calls. Listings are created UNATTACHED (a Unit is attached later).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = pushSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    if (!parsed.data.guestyListingIds && !parsed.data.filter) {
      return NextResponse.json({ error: 'Provide guestyListingIds or filter' }, { status: 400 })
    }

    // Resolve the source GuestyListing rows: by explicit ids, or by the same
    // where-clause the listings table uses (so "select all matching" works).
    let where: Prisma.GuestyListingWhereInput
    if (parsed.data.guestyListingIds) {
      where = { id: { in: parsed.data.guestyListingIds } }
    } else {
      const f = parsed.data.filter!
      const q = f.q?.trim()
      where = {
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { nickname: { contains: q, mode: 'insensitive' } },
                { addressFull: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(f.status === 'active' ? { active: true } : f.status === 'inactive' ? { active: false } : {}),
        ...(f.mapped === 'mapped'
          ? { unitId: { not: null } }
          : f.mapped === 'unmapped'
            ? { unitId: null }
            : {}),
      }
    }

    const sources = await db.guestyListing.findMany({
      where,
      select: { id: true, guestyId: true, raw: true },
    })

    let pushed = 0
    const listingIds: string[] = []

    for (let i = 0; i < sources.length; i += UPSERT_CHUNK) {
      const chunk = sources.slice(i, i + UPSERT_CHUNK)
      const results = await Promise.all(
        chunk.map(async (gl) => {
          const raw = gl.raw as Record<string, unknown>
          const fields = projectListingToDataMaster(raw)
          // Seed the curated photo set from the Guesty published photos (create only).
          const photos = JSON.parse(JSON.stringify(projectListingPhotos(raw)))
          // Key on the stable Guesty id → re-push updates the SAME record, never
          // duplicates. Data Master is the source of truth: seed editable fields
          // ONLY on first create; on re-push leave them untouched (just ensure the
          // link) so manual edits are never overwritten. Drift is surfaced in the
          // listing detail instead.
          const listing = await db.listing.upsert({
            where: { guestyId: gl.guestyId },
            create: { ...fields, guestyId: gl.guestyId, guestyListingId: gl.id, photos },
            update: { guestyListingId: gl.id },
          })
          await db.guestyListing.update({
            where: { id: gl.id },
            data: { promoted: true, promotedAt: new Date(), listingId: listing.id },
          })
          return listing.id
        })
      )
      listingIds.push(...results)
      pushed += results.length
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'listings',
          recordId: listingIds[0] ?? null,
          newData: JSON.parse(JSON.stringify({ action: 'push', pushed })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty listing push', e))

    return NextResponse.json({ data: { pushed } })
  } catch (error) {
    console.error('[POST /api/v1/integrations/guesty/listings/push]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
