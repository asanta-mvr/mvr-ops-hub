import { z } from 'zod'

// Dates arrive as ISO-8601 strings in JSON; coerce to Date. Nullable so a field
// can be explicitly cleared on update.
const optionalDate = z.coerce.date().optional().nullable()

export const createDocumentSchema = z
  .object({
    typeKey: z.string().min(1).max(50),
    ownerId: z.string().min(1).max(50).optional().nullable(),
    guestyOwnerId: z.string().min(1).max(50).optional().nullable(),
    unitId: z.string().min(1).max(50).optional().nullable(),
    fileUrl: z.string().max(2000).optional().nullable(),
    issueDate: optionalDate,
    expireDate: optionalDate,
    notes: z.string().max(5000).optional().nullable(),
    label: z.string().max(120).optional().nullable(),
  })
  .refine(
    d => [d.ownerId, d.guestyOwnerId, d.unitId].filter(Boolean).length === 1,
    {
      message: 'A document must attach to exactly one of owner, legal owner, or unit',
      path: ['ownerId'],
    }
  )

export const updateDocumentSchema = z.object({
  typeKey: z.string().min(1).max(50).optional(),
  fileUrl: z.string().max(2000).optional().nullable(),
  issueDate: optionalDate,
  expireDate: optionalDate,
  notes: z.string().max(5000).optional().nullable(),
})

// Per-owner override of a global alert rule. `typeKey: null` = applies to all
// document types for this owner.
export const alertPrefSchema = z.object({
  typeKey: z.string().min(1).max(50).nullable().optional(),
  muted: z.boolean().optional(),
  notifyOwner: z.boolean().nullable().optional(),
  leadTimeDays: z.array(z.number().int().positive().max(3650)).optional(),
})

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>
export type AlertPrefInput = z.infer<typeof alertPrefSchema>
