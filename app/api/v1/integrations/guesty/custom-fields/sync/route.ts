import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { withDbRetry } from '@/lib/db/retry'
import {
  fetchCustomFieldDefinitions,
  getOrCreateConnection,
  getValidToken,
  projectCustomFieldDefinition,
} from '@/lib/integrations/guesty'

export const maxDuration = 120
export const dynamic = 'force-dynamic'

const UPSERT_CHUNK = 25

/**
 * Resolve the Guesty account id needed for GET /accounts/{id}/custom-fields.
 * Every listing raw payload carries `accountId`, so read it from any stored
 * listing; fall back to an explicit env var. Returns null if neither is set.
 */
async function resolveAccountId(): Promise<string | null> {
  const envId = process.env.GUESTY_ACCOUNT_ID?.trim()
  if (envId) return envId
  const listing = await db.guestyListing.findFirst({ select: { raw: true } })
  const raw = listing?.raw as Record<string, unknown> | null | undefined
  const accountId = raw && typeof raw.accountId === 'string' ? raw.accountId : null
  return accountId || null
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

    const accountId = await resolveAccountId()
    if (!accountId) {
      return NextResponse.json(
        { error: 'No Guesty account id available — run a Listing refresh first (or set GUESTY_ACCOUNT_ID).' },
        { status: 400 }
      )
    }

    let synced = 0
    try {
      const token = await getValidToken(connection)
      const rawDefs = await fetchCustomFieldDefinitions(token, accountId)

      for (let i = 0; i < rawDefs.length; i += UPSERT_CHUNK) {
        const chunk = rawDefs.slice(i, i + UPSERT_CHUNK)
        await Promise.all(
          chunk.map((raw) => {
            const p = projectCustomFieldDefinition(raw)
            if (!p) return Promise.resolve()
            const data = {
              connectionId: connection.id,
              displayName: p.displayName,
              key: p.key,
              objectType: p.objectType,
              type: p.type,
              options: p.options,
              isPublic: p.isPublic,
              raw: JSON.parse(JSON.stringify(raw)) as Prisma.InputJsonValue,
              syncedAt: new Date(),
            }
            synced += 1
            return withDbRetry(() =>
              db.guestyCustomField.upsert({
                where: { guestyId: p.guestyId },
                create: { guestyId: p.guestyId, ...data },
                update: data,
              })
            )
          })
        )
      }

      await withDbRetry(() =>
        db.guestyConnection.update({
          where: { id: connection.id },
          data: { status: 'connected', lastError: null },
        })
      )
      await db.guestySyncLog
        .create({
          data: {
            connectionId: connection.id,
            operation: 'custom_field_sync',
            status: 'success',
            itemCount: synced,
            message: `Pulled ${synced} custom field${synced === 1 ? '' : 's'}`,
          },
        })
        .catch((e) => console.error('[guesty sync log]', e))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Guesty custom field sync failed'
      await withDbRetry(() =>
        db.guestyConnection.update({
          where: { id: connection.id },
          data: { status: 'error', lastError: message },
        })
      ).catch((e) => console.error('[guesty custom field sync] failed to persist error state', e))
      await db.guestySyncLog
        .create({ data: { connectionId: connection.id, operation: 'custom_field_sync', status: 'error', message } })
        .catch((e) => console.error('[guesty sync log]', e))
      return NextResponse.json({ error: message }, { status: 502 })
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'guesty_custom_fields',
          recordId: connection.id,
          newData: JSON.parse(JSON.stringify({ action: 'sync', synced })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty custom field sync', e))

    return NextResponse.json({ data: { synced } })
  } catch (error) {
    console.error('[POST /api/v1/integrations/guesty/custom-fields/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
