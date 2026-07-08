import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getOrCreateConnection, listChannels, resolveToken } from '@/lib/integrations/slack'

// POST /api/v1/integrations/slack/channels/sync
// Pull every public channel from the workspace and upsert the local mirror.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const connection = await getOrCreateConnection()
    if (!connection) {
      return NextResponse.json({ error: 'Slack is not connected' }, { status: 400 })
    }

    try {
      const token = resolveToken(connection)
      const channels = await listChannels(token)

      // Upsert each channel by its stable Slack id.
      for (const c of channels) {
        await db.slackChannel.upsert({
          where: { slackChannelId: c.slackChannelId },
          create: {
            slackChannelId: c.slackChannelId,
            connectionId: connection.id,
            name: c.name,
            isPrivate: c.isPrivate,
            isArchived: c.isArchived,
            isMember: c.isMember,
            numMembers: c.numMembers,
          },
          update: {
            connectionId: connection.id,
            name: c.name,
            isPrivate: c.isPrivate,
            isArchived: c.isArchived,
            isMember: c.isMember,
            numMembers: c.numMembers,
            syncedAt: new Date(),
          },
        })
      }

      const updated = await db.slackConnection.update({
        where: { id: connection.id },
        data: { status: 'connected', lastError: null, lastSyncAt: new Date(), lastSyncCount: channels.length },
      })

      await db.slackSyncLog.create({
        data: {
          connectionId: connection.id,
          operation: 'channel_sync',
          status: 'success',
          message: `Synced ${channels.length} channel${channels.length === 1 ? '' : 's'}`,
          itemCount: channels.length,
        },
      }).catch((e) => console.error('[slack sync log]', e))

      db.auditLog
        .create({
          data: {
            userId: session.user.id,
            action: 'UPDATE',
            tableName: 'slack_channels',
            recordId: connection.id,
            newData: { synced: channels.length } as Prisma.InputJsonValue,
            ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
            userAgent: req.headers.get('user-agent') ?? undefined,
          },
        })
        .catch((e) => console.error('[audit] slack_channels SYNC', e))

      return NextResponse.json({ data: { synced: channels.length, lastSyncAt: updated.lastSyncAt } })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync Slack channels'
      await db.slackConnection.update({
        where: { id: connection.id },
        data: { status: 'error', lastError: message },
      })
      await db.slackSyncLog.create({
        data: { connectionId: connection.id, operation: 'channel_sync', status: 'error', message },
      }).catch((e) => console.error('[slack sync log]', e))
      return NextResponse.json({ error: message }, { status: 502 })
    }
  } catch (error) {
    console.error('[POST /api/v1/integrations/slack/channels/sync]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
