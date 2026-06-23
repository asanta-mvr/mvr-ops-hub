import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import {
  fetchAllListingsFull,
  getOrCreateConnection,
  getValidToken,
  projectListing,
} from '@/lib/integrations/guesty'

// Pulling every listing's full detail can take a while for large accounts.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const UPSERT_CHUNK = 25

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connection = await getOrCreateConnection()
    if (!connection) {
      return NextResponse.json(
        { error: 'No Guesty credentials configured (set GUESTY_CLIENT_ID / GUESTY_CLIENT_SECRET)' },
        { status: 400 }
      )
    }

    let synced = 0
    try {
      const token = await getValidToken(connection)
      const rawListings = await fetchAllListingsFull(token)

      // Upsert each listing by guestyId — full payload to `raw`, projection to
      // the typed columns. Chunked to avoid opening 300 connections at once.
      for (let i = 0; i < rawListings.length; i += UPSERT_CHUNK) {
        const chunk = rawListings.slice(i, i + UPSERT_CHUNK)
        await Promise.all(
          chunk.map((raw) => {
            const projected = projectListing(raw)
            if (!projected) return Promise.resolve()
            const data = {
              connectionId: connection.id,
              title: projected.title,
              nickname: projected.nickname,
              propertyType: projected.propertyType,
              addressFull: projected.addressFull,
              accommodates: projected.accommodates,
              bedrooms: projected.bedrooms,
              bathrooms: projected.bathrooms,
              active: projected.active,
              pictureUrl: projected.pictureUrl,
              createdAtGuesty: projected.createdAtGuesty,
              raw: JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue,
              syncedAt: new Date(),
            }
            synced += 1
            return db.guestyListing.upsert({
              where: { guestyId: projected.guestyId },
              create: { guestyId: projected.guestyId, ...data },
              update: data,
            })
          })
        )
      }

      await db.guestyConnection.update({
        where: { id: connection.id },
        data: { status: 'connected', lastError: null, lastSyncAt: new Date(), lastSyncCount: synced },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guesty sync failed'
      await db.guestyConnection.update({
        where: { id: connection.id },
        data: { status: 'error', lastError: message },
      })
      return NextResponse.json({ error: message }, { status: 502 })
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'guesty_connections',
          recordId: connection.id,
          newData: JSON.parse(JSON.stringify({ action: 'sync', synced })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty sync', e))

    return NextResponse.json({ data: { synced, total: synced } })
  } catch (error) {
    console.error('[POST /api/v1/integrations/guesty/connection/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
