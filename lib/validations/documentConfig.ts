import { z } from 'zod'

const leadTimeDays = z.array(z.number().int().positive().max(3650))

// Configurable document-type catalog entry (e.g. contract / w9 / coi / custom).
export const documentTypeSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores only'),
  label: z.string().min(1).max(100),
  scope: z.enum(['owner', 'unit']),
  hasExpiry: z.boolean().default(false),
  required: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
})

export const updateDocumentTypeSchema = documentTypeSchema.partial().omit({ key: true })

// Global (default) alert rule for a document type.
export const alertRuleSchema = z.object({
  typeKey: z.string().min(1).max(50),
  enabled: z.boolean().default(true),
  leadTimeDays: leadTimeDays.default([]),
  notifyInternal: z.boolean().default(true),
  internalChannel: z.enum(['slack', 'email']).default('slack'),
  internalTarget: z.string().max(200).optional().nullable(),
  notifyOwner: z.boolean().default(false),
  ownerLeadTimeDays: leadTimeDays.default([]),
})

export const updateAlertRuleSchema = alertRuleSchema.partial().omit({ typeKey: true })

export type DocumentTypeInput = z.infer<typeof documentTypeSchema>
export type UpdateDocumentTypeInput = z.infer<typeof updateDocumentTypeSchema>
export type AlertRuleInput = z.infer<typeof alertRuleSchema>
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>
