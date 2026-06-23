import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { fetchAllOwners, getOrCreateConnection, getValidToken, projectOwner } from '@/lib/integrations/guesty'

// Pulling every owner can take a while for large accounts.
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const UPSERT_CHUNK = 25

/** Normalize a name/email for case-insensitive matching. */
function norm(v: string | null | undefined): string | null {
  const s = v?.trim().toLowerCase()
  return s ? s : null
}

/**
 * Build a key → ownerId map keeping only keys that map to EXACTLY one Data
 * Master Owner (ambiguous keys are dropped so we never auto-suggest a guess).
 */
function uniqueKeyMap(pairs: Array<[string | null, string]>): Map<string, string> {
  const seen = new Map<string, string | null>() // key → ownerId | null(ambiguous)
  for (const [key, ownerId] of pairs) {
    if (!key) continue
    if (!seen.has(key)) seen.set(key, ownerId)
    else if (seen.get(key) !== ownerId) seen.set(key, null)
  }
  const out = new Map<string, string>()
  for (const [key, ownerId] of Array.from(seen.entries())) if (ownerId) out.set(key, ownerId)
  return out
}

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

    // Preload Data Master owners once to compute auto-match suggestions.
    const dmOwners = await db.owner.findMany({ select: { id: true, email: true, nickname: true } })
    const byEmail = uniqueKeyMap(dmOwners.map((o) => [norm(o.email), o.id]))
    const byName = uniqueKeyMap(dmOwners.map((o) => [norm(o.nickname), o.id]))

    let synced = 0
    try {
      const token = await getValidToken(connection)
      const rawOwners = await fetchAllOwners(token)

      for (let i = 0; i < rawOwners.length; i += UPSERT_CHUNK) {
        const chunk = rawOwners.slice(i, i + UPSERT_CHUNK)
        await Promise.all(
          chunk.map((raw) => {
            const p = projectOwner(raw)
            if (!p) return Promise.resolve()

            // Suggest a Data Master Owner: prefer a unique email match, else a
            // unique name match. Never auto-confirm — only fills suggestedOwnerId.
            const suggestedOwnerId =
              (p.email ? byEmail.get(norm(p.email)!) : undefined) ??
              (p.fullName ? byName.get(norm(p.fullName)!) : undefined) ??
              null

            const data = {
              connectionId: connection.id,
              fullName: p.fullName,
              email: p.email,
              phone: p.phone,
              ownerType: p.ownerType,
              accountId: p.accountId,
              pictureUrl: p.pictureUrl,
              listingCount: p.listingCount,
              createdAtGuesty: p.createdAtGuesty,
              suggestedOwnerId,
              raw: JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue,
              syncedAt: new Date(),
            }
            synced += 1
            return db.guestyOwner.upsert({
              where: { guestyId: p.guestyId },
              // On update, leave a confirmed `ownerUniqueId` untouched.
              create: { guestyId: p.guestyId, ...data },
              update: data,
            })
          })
        )
      }

      await db.guestyConnection.update({
        where: { id: connection.id },
        data: { status: 'connected', lastError: null },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guesty owner sync failed'
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
          tableName: 'guesty_owners',
          recordId: connection.id,
          newData: JSON.parse(JSON.stringify({ action: 'sync', synced })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty owner sync', e))

    return NextResponse.json({ data: { synced } })
  } catch (error) {
    console.error('[POST /api/v1/integrations/guesty/owners/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
