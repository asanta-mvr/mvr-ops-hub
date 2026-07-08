import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getOrCreateConnection, postMessage, resolveToken } from '@/lib/integrations/slack'
import { sendTestMessageSchema } from '@/lib/validations/slack'

// POST /api/v1/integrations/slack/test
// Send a test message to a channel to verify end-to-end delivery from the UI.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = sendTestMessageSchema.safeParse(body)
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const connection = await getOrCreateConnection()
    if (!connection) {
      return NextResponse.json({ error: 'Slack is not connected' }, { status: 400 })
    }

    const { channelId } = validated.data
    const text =
      validated.data.message?.trim() ||
      ':wave: Test message from the MVR Operations Hub — Slack notifications are working.'

    try {
      const token = resolveToken(connection)
      await postMessage(token, channelId, text)

      await db.slackSyncLog.create({
        data: {
          connectionId: connection.id,
          operation: 'test_message',
          status: 'success',
          message: `Test message sent to ${channelId}`,
        },
      }).catch((e) => console.error('[slack sync log]', e))

      return NextResponse.json({ data: { sent: true } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send test message'
      await db.slackSyncLog.create({
        data: { connectionId: connection.id, operation: 'test_message', status: 'error', message },
      }).catch((e) => console.error('[slack sync log]', e))
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error) {
    console.error('[POST /api/v1/integrations/slack/test]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
