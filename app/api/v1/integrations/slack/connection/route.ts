import { NextRequest, NextResponse } from 'next/server'
import type { SlackConnection, Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import {
  authTest,
  getEnvBotToken,
  getOrCreateConnection,
  isEnvManaged,
  resolveToken,
  storeToken,
} from '@/lib/integrations/slack'
import { upsertSlackConnectionSchema } from '@/lib/validations/slack'

// Public, redacted view of a connection — never exposes the bot token.
function redact(conn: SlackConnection) {
  return {
    id: conn.id,
    name: conn.name,
    teamId: conn.teamId,
    teamName: conn.teamName,
    status: conn.status,
    lastError: conn.lastError,
    lastSyncAt: conn.lastSyncAt,
    lastSyncCount: conn.lastSyncCount,
    hasToken: isEnvManaged() || Boolean(conn.botToken),
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

    // Auto-provisions a row from the env token when present.
    const connection = await getOrCreateConnection()
    return NextResponse.json({ data: connection ? redact(connection) : null })
  } catch (error) {
    console.error('[GET /api/v1/integrations/slack/connection]', error)
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
    const validated = upsertSlackConnectionSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { name } = validated.data
    const envToken = getEnvBotToken()
    const existing = await db.slackConnection.findFirst({ orderBy: { createdAt: 'asc' } })

    // Resolve the token to store + validate with. The env var wins.
    let plaintextToken: string
    let storedToken: string

    if (envToken) {
      plaintextToken = envToken
      storedToken = '' // token lives in env, not the DB
    } else {
      const bodyToken = validated.data.botToken
      if (bodyToken) {
        plaintextToken = bodyToken
        storedToken = storeToken(plaintextToken)
      } else if (existing?.botToken) {
        // Keep the existing token (write-only field left blank on re-save).
        plaintextToken = resolveToken(existing)
        storedToken = existing.botToken
      } else {
        return NextResponse.json(
          { error: 'Validation failed', details: { fieldErrors: { botToken: ['Bot token is required'] } } },
          { status: 400 }
        )
      }
    }

    const saved = existing
      ? await db.slackConnection.update({
          where: { id: existing.id },
          data: { name, botToken: storedToken },
        })
      : await db.slackConnection.create({
          data: { name, botToken: storedToken },
        })

    // Validate the token by calling auth.test; capture the workspace identity.
    let result: SlackConnection
    try {
      const identity = await authTest(plaintextToken)
      result = await db.slackConnection.update({
        where: { id: saved.id },
        data: {
          status: 'connected',
          lastError: null,
          teamId: identity.teamId,
          teamName: identity.teamName,
        },
      })
      await db.slackSyncLog.create({
        data: {
          connectionId: saved.id,
          operation: 'test_connection',
          status: 'success',
          message: identity.teamName ? `Connected to ${identity.teamName}` : 'Connected to Slack',
        },
      }).catch((e) => console.error('[slack sync log]', e))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Slack'
      result = await db.slackConnection.update({
        where: { id: saved.id },
        data: { status: 'error', lastError: message },
      })
      await db.slackSyncLog.create({
        data: { connectionId: saved.id, operation: 'test_connection', status: 'error', message },
      }).catch((e) => console.error('[slack sync log]', e))
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: existing ? 'UPDATE' : 'CREATE',
          tableName: 'slack_connections',
          recordId: result.id,
          newData: JSON.parse(JSON.stringify(redact(result))) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] slack_connections UPSERT', e))

    return NextResponse.json({ data: redact(result) })
  } catch (error) {
    console.error('[PUT /api/v1/integrations/slack/connection]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
