import { z } from 'zod'

export const createBuildingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  nickname: z.string().min(1, 'Nickname is required').max(100),
  status: z.enum(['active', 'inactive', 'onboarding']).default('onboarding'),
  address: z.string().min(1, 'Address is required').max(500),
  zone: z.string().min(1, 'Zone is required').max(100),
  zipcode: z.string().min(1, 'Zip code is required').max(20),
  lat: z.number().min(-90).max(90).optional(),
  long: z.number().min(-180).max(180).optional(),
  googleUrl: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().optional(),
  photos: z.array(z.string()).default([]),
  floorplanUrls: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  checkinHours: z.string().max(100).optional(),
  checkoutHours: z.string().max(100).optional(),
  frontdeskHours: z.string().max(100).optional(),
  rules: z.string().optional(),
  emergencyContacts: z
    .array(
      z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        role: z.string().min(1),
      })
    )
    .optional(),
  knowledgeBase: z.string().optional(),
  frontdeskPhone: z.string().max(30).optional(),
  frontdeskEmail: z.string().email().optional().or(z.literal('')),
  cityId: z.string().cuid().optional(),
})

export const updateBuildingSchema = createBuildingSchema.partial()

export type CreateBuildingInput = z.infer<typeof createBuildingSchema>
export type UpdateBuildingInput = z.infer<typeof updateBuildingSchema>
