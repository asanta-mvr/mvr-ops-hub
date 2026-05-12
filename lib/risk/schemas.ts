import { z } from 'zod'

export const ALLOWED_RISK_ROLES: readonly string[] = [
  'super_admin',
  'operations_manager',
  'accounting',
]

export const summaryFilterSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
})

export const disputeFiltersSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  status: z.string().optional(),
  reason: z.string().optional(),
  riskLevel: z.enum(['normal', 'elevated', 'highest']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const notifyPayloadSchema = z
  .object({
    disputeIds: z.array(z.string().min(1)).max(50).optional(),
    chargeIds: z.array(z.string().min(1)).max(50).optional(),
    channel: z.string().min(1),
    message: z.string().max(2000).optional(),
    ruleId: z.string().optional(),
    priority: z.enum(['normal', 'high', 'p1']).default('normal'),
  })
  .refine((d) => (d.disputeIds && d.disputeIds.length > 0) || (d.chargeIds && d.chargeIds.length > 0), {
    message: 'Either disputeIds or chargeIds must contain at least one id',
  })

export const chargeFiltersSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  reasons: z.string().optional(), // comma-separated
  riskLevel: z.string().optional(), // comma-separated, subset of normal|elevated|highest
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const refundFiltersSchema = z.object({
  year: z.coerce.number().int().min(2020).max(2100).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  reasons: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

export const ruleCriteriaSchema = z.object({
  reason: z.string().optional(),
  riskLevel: z.enum(['normal', 'elevated', 'highest']).optional(),
  status: z.string().optional(),
  minAmountCents: z.number().int().min(0).optional(),
})

export const ruleInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  criteria: ruleCriteriaSchema,
  channel: z.string().min(1),
  priority: z.enum(['normal', 'high', 'p1']).default('normal'),
  enabled: z.boolean().default(true),
})

export const watchlistInputSchema = z.object({
  email: z.string().email().optional(),
  cardLast4: z.string().regex(/^\d{4}$/).optional(),
  lossUsd: z.coerce.number().min(0).optional(),
  reason: z.string().max(1000).optional(),
}).refine((d) => d.email || d.cardLast4, {
  message: 'Either email or cardLast4 is required',
})

export type NotifyPayload = z.infer<typeof notifyPayloadSchema>
export type RuleInput = z.infer<typeof ruleInputSchema>
export type RuleCriteria = z.infer<typeof ruleCriteriaSchema>
export type WatchlistInput = z.infer<typeof watchlistInputSchema>
export type DisputeFilters = z.infer<typeof disputeFiltersSchema>
