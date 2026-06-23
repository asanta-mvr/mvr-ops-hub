import { z } from 'zod'

// Upsert payload for the (singleton) Guesty connection. When credentials come
// from environment variables (GUESTY_CLIENT_ID / GUESTY_CLIENT_SECRET) the
// client id/secret are ignored — only `name` matters. When not env-managed,
// the route enforces that a client id + secret are present on first create.
export const upsertGuestyConnectionSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  clientId: z.string().max(200).optional(),
  clientSecret: z.string().max(500).optional(),
})

export type UpsertGuestyConnectionInput = z.infer<typeof upsertGuestyConnectionSchema>
