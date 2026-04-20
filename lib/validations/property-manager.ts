import { z } from 'zod'

export const createPropertyManagerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  contactName: z.string().max(200).optional(),
  contactPhone: z.string().max(30).optional(),
  contactEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  contactRole: z.string().max(100).optional(),
  contactArea: z.string().max(200).optional(),
  contactMatters: z.string().optional(),
  isPrimary: z.boolean(),
})

export const updatePropertyManagerSchema = createPropertyManagerSchema.partial()

export type CreatePropertyManagerInput = z.infer<typeof createPropertyManagerSchema>
export type UpdatePropertyManagerInput = z.infer<typeof updatePropertyManagerSchema>
