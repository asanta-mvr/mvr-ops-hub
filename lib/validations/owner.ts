import { z } from 'zod'

// `id` is auto-generated (cuid). `nickname` (combined display name) is derived
// server-side from firstName + lastName, so it is not accepted here.
export const createOwnerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(60),
  lastName: z.string().max(60).optional(),
  type: z.string().max(50).optional(), // flexible tag (VIP, Normal, BIP, …)
  category: z.string().max(50).optional(),
  personalityScore: z.number().int().min(0).max(100).optional(),
  communicationScore: z.number().int().min(0).max(100).optional(),
  documentType: z.string().max(50).optional(),
  documentNumber: z.string().max(50).optional(),
  phone: z.string().max(40).optional(), // includes country dial code
  address: z.string().max(300).optional(), // street line
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  otherEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  photoUrl: z.string().optional(),
  linkedin: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  dateOfBirth: z.coerce.date().optional().nullable(),
  nationality: z.string().max(100).optional(),
  language: z.string().max(50).optional(),
  siteUser: z.string().max(100).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
})

export const updateOwnerSchema = createOwnerSchema.partial()

export type CreateOwnerInput = z.infer<typeof createOwnerSchema>
export type UpdateOwnerInput = z.infer<typeof updateOwnerSchema>
