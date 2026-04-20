import { z } from 'zod'

export const createUnitSchema = z.object({
  number: z.string().min(1, 'Unit number is required').max(20),
  floor: z.number().int().min(0).optional(),
  line: z.string().max(10).optional(),
  view: z.string().max(100).optional(),
  type: z
    .enum(['studio', 'one_br', 'two_br', 'three_br', 'four_br', 'penthouse', 'other'])
    .optional(),
  bedrooms: z.number().int().min(0).max(20).optional(),
  bathrooms: z.number().min(0).max(20).optional(),
  bathType: z.string().max(50).optional(),
  sqft: z.number().int().min(0).optional(),
  mt2: z.number().min(0).optional(),
  capacity: z.number().int().min(1).optional(),
  amenityCap: z.number().int().min(0).optional(),
  totalBeds: z.number().int().min(0).optional(),
  kings: z.number().int().min(0).default(0),
  queens: z.number().int().min(0).default(0),
  twins: z.number().int().min(0).default(0),
  otherBeds: z.string().max(200).optional(),
  hasKitchen: z.boolean().default(false),
  hasBalcony: z.boolean().default(false),
  photoUrls: z.array(z.string()).default([]),
  status: z.enum(['active', 'inactive', 'renovation', 'onboarding']).default('onboarding'),
  score: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
  buildingId: z.string().cuid('Invalid building ID'),
  ownerUniqueId: z.string().optional(),
})

export const updateUnitSchema = createUnitSchema.partial().omit({ buildingId: true })

export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
