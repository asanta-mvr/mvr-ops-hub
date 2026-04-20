import { z } from 'zod'

export const createOwnerSchema = z.object({
  uniqueId: z.string().min(1, 'Unique ID is required').max(50),
  nickname: z.string().min(1, 'Nickname is required').max(100),
  type: z.enum(['individual', 'company']).default('individual'),
  category: z.string().max(50).optional(),
  personality: z.string().max(200).optional(),
  documentType: z.string().max(50).optional(),
  documentNumber: z.string().max(50).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  otherEmail: z.string().email().optional().or(z.literal('')),
  photoUrl: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal('')),
  age: z.number().int().min(18).max(120).optional(),
  nationality: z.string().max(50).optional(),
  language: z.string().length(2).default('en'),
  siteUser: z.string().max(100).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive', 'churned']).default('active'),
})

export const updateOwnerSchema = createOwnerSchema.partial().omit({ uniqueId: true })

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>
export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>
