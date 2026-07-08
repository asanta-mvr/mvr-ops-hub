import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canEdit, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getOrCreateConnection, isEnvManaged } from '@/lib/integrations/slack'
import SlackConnectionForm from '@/components/modules/integrations/slack/SlackConnectionForm'
import SlackChannelsTable from '@/components/modules/integrations/slack/SlackChannelsTable'

export const metadata: Metadata = { title: 'Slack · Integrations' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

export default async function SlackIntegrationPage() {
  const session = await auth()
  await requireView(session, 'integrations')
  const editable = await canEdit(session, 'integrations')

  const connection = await getOrCreateConnection()
  const envManaged = isEnvManaged()

  const [channelRows, channelTotal, syncLogs] = await Promise.all([
    db.slackChannel.findMany({
      where: { isArchived: false },
      select: {
        id: true,
        slackChannelId: true,
        name: true,
        isPrivate: true,
        isArchived: true,
        isMember: true,
        numMembers: true,
        syncedAt: true,
      },
      orderBy: [{ name: 'asc' }],
      take: PAGE_SIZE,
    }),
    db.slackChannel.count({ where: { isArchived: false } }),
    db.slackSyncLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
  ])

  // Pass only safe connection fields to the client (never the bot token).
  const safeConnection = connection
    ? {
        id: connection.id,
        name: connection.name,
        teamId: connection.teamId,
        teamName: connection.teamName,
        status: connection.status,
        lastError: connection.lastError,
        lastSyncAt: connection.lastSyncAt ? connection.lastSyncAt.toISOString() : null,
        lastSyncCount: connection.lastSyncCount,
        hasToken: envManaged || Boolean(connection.botToken),
        envManaged,
      }
    : null

  const initialChannels = channelRows.map((r) => ({ ...r, syncedAt: r.syncedAt.toISOString() }))
  const initialLogs = syncLogs.map((l) => ({
    id: l.id,
    operation: l.operation,
    status: l.status,
    message: l.message,
    itemCount: l.itemCount,
    createdAt: l.createdAt.toISOString(),
  }))

  const connected = safeConnection?.status === 'connected'

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-mvr-primary"
        >
          <ChevronLeft className="size-4" />
          Integrations
        </Link>
        <h1 className="font-display mt-2 text-3xl text-mvr-primary">Slack</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the MVR Slack app to list your channels and route hub notifications to the right teams.
        </p>
      </div>

      <SlackConnectionForm
        connection={safeConnection}
        editable={editable}
        envManaged={envManaged}
        logs={initialLogs}
      />

      <div className="space-y-3">
        <div>
          <h2 className="font-display text-2xl text-mvr-primary">Channels</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Every public channel in your workspace. Send a test message to confirm the bot can post.
          </p>
        </div>
        <SlackChannelsTable
          initialRows={initialChannels}
          initialTotal={channelTotal}
          connected={connected}
          editable={editable}
          pageSize={PAGE_SIZE}
        />
      </div>
    </div>
  )
}
