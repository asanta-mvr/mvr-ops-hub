import { z } from 'zod'

export const createTicketSchema = z.object({
  source: z.enum(['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']),
  externalId: z.string().optional(),
  confirmationCode: z.string().optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  checkinDate: z.string().optional(),
  checkoutDate: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().min(1),
  body: z.string(),
  fromEmail: z.string().email(),
  listingId: z.string().optional(),
  unitId: z.string().optional(),
  buildingId: z.string().optional(),
  assignedToId: z.string().optional(),
})

export const updateTicketSchema = z.object({
  status: z.enum(['open', 'in_progress', 'pending_guest', 'pending_ota', 'resolved', 'closed']).optional(),
  assignedToId: z.string().nullable().optional(),
  listingId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  buildingId: z.string().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  guestPhone: z.string().nullable().optional(),
  checkinDate: z.string().datetime().nullable().optional(),
  checkoutDate: z.string().datetime().nullable().optional(),
  category: z.string().nullable().optional(),
  successRate: z.number().nullable().optional(),
})

export const createCommentSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().optional().default(false),
  source: z.string().optional().default('web'),
})

export type CreateTicketInput = z.infer<typeof createTicketSchema>
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>
export type CreateCommentInput = z.infer<typeof createCommentSchema>
