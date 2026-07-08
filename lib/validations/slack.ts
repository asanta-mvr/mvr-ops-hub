import { z } from 'zod'

// Upsert payload for the (singleton) Slack connection. When the bot token comes
// from the SLACK_BOT_TOKEN env var the token field is ignored — only `name`
// matters. When not env-managed, the route enforces that a token is present on
// first create. The token is write-only (never returned to the client).
export const upsertSlackConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  botToken: z.string().max(200).optional(),
})

export type UpsertSlackConnectionInput = z.infer<typeof upsertSlackConnectionSchema>

// Send a test message to a channel from the UI to verify end-to-end delivery.
export const sendTestMessageSchema = z.object({
  channelId: z.string().min(1, 'Channel is required').max(64),
  message: z.string().max(500).optional(),
})

export type SendTestMessageInput = z.infer<typeof sendTestMessageSchema>
