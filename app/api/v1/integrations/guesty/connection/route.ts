import { NextRequest, NextResponse } from 'next/server'
import type { GuestyConnection, Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { decryptSecret, encryptSecret } from '@/lib/auth/crypto'
import {
  fetchAccessToken,
  getEnvCredentials,
  getOrCreateConnection,
  isEnvManaged,
} from '@/lib/integrations/guesty'
import { upsertGuestyConnectionSchema } from '@/lib/validations/guesty'

const KEY_ENV = 'INTEGRATION_SECRET_KEY'

// Public, redacted view of a connection — never exposes the secret or token.
function redact(conn: GuestyConnection) {
  return {
    id: conn.id,
    name: conn.name,
    clientId: conn.clientId,
    status: conn.status,
    lastError: conn.lastError,
    lastSyncAt: conn.lastSyncAt,
    lastSyncCount: conn.lastSyncCount,
    hasSecret: isEnvManaged() || Boolean(conn.clientSecret),
    envManaged: isEnvManaged(),
    updatedAt: conn.updatedAt,
  }
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Auto-provisions a row from env credentials when present.
    const connection = await getOrCreateConnection()
    return NextResponse.json({ data: connection ? redact(connection) : null })
  } catch (error) {
    console.error('[GET /api/v1/integrations/guesty/connection]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = upsertGuestyConnectionSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { name } = validated.data
    const env = getEnvCredentials()
    const existing = await db.guestyConnection.findFirst({ orderBy: { createdAt: 'asc' } })

    // Resolve the credentials to store + validate with. Env vars win.
    let clientId: string
    let plaintextSecret: string
    let storedSecret: string

    if (env) {
      clientId = env.clientId
      plaintextSecret = env.clientSecret
      storedSecret = '' // secret lives in env, not the DB
    } else {
      const bodyClientId = validated.data.clientId
      const bodySecret = validated.data.clientSecret
      if (!bodyClientId) {
        return NextResponse.json(
          { error: 'Validation failed', details: { fieldErrors: { clientId: ['Client ID is required'] } } },
          { status: 400 }
        )
      }
      clientId = bodyClientId
      if (bodySecret) {
        plaintextSecret = bodySecret
      } else if (existing?.clientSecret) {
        plaintextSecret = decryptSecret(existing.clientSecret, KEY_ENV)
      } else {
        return NextResponse.json(
          { error: 'Validation failed', details: { fieldErrors: { clientSecret: ['Client Secret is required'] } } },
          { status: 400 }
        )
      }
      storedSecret = encryptSecret(plaintextSecret, KEY_ENV)
    }

    const saved = existing
      ? await db.guestyConnection.update({
          where: { id: existing.id },
          data: { name, clientId, clientSecret: storedSecret },
        })
      : await db.guestyConnection.create({
          data: { name, clientId, clientSecret: storedSecret },
        })

    // Validate credentials by minting a token; cache it on success.
    let result: GuestyConnection
    try {
      const token = await fetchAccessToken(clientId, plaintextSecret)
      result = await db.guestyConnection.update({
        where: { id: saved.id },
        data: {
          status: 'connected',
          lastError: null,
          accessToken: process.env[KEY_ENV]
            ? `enc:${encryptSecret(token.accessToken, KEY_ENV)}`
            : `raw:${token.accessToken}`,
          tokenExpiresAt: token.expiresAt,
        },
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Guesty'
      result = await db.guestyConnection.update({
        where: { id: saved.id },
        data: { status: 'error', lastError: message, accessToken: null, tokenExpiresAt: null },
      })
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: existing ? 'UPDATE' : 'CREATE',
          tableName: 'guesty_connections',
          recordId: result.id,
          newData: JSON.parse(JSON.stringify(redact(result))) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] guesty_connections UPSERT', e))

    return NextResponse.json({ data: redact(result) })
  } catch (error) {
    console.error('[PUT /api/v1/integrations/guesty/connection]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
