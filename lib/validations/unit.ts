import { z } from 'zod'

export const PHOTO_QUALITY_VALUES = ['pro', 'preliminary', 'low_quality'] as const
export type PhotoQuality = (typeof PHOTO_QUALITY_VALUES)[number]

/**
 * Coerce a stored photoQuality value to the enum, or `undefined` if it doesn't
 * match. Legacy spreadsheet imports stored capitalized/spaced values like
 * "Pro" or "Low Quality" (see scripts/import-units.ts) that don't match the
 * lowercase enum and would otherwise fail validation when a unit is edited.
 */
export function normalizePhotoQuality(v: unknown): PhotoQuality | undefined {
  const s = String(v ?? '').trim().toLowerCase().replace(/\s+/g, '_')
  return (PHOTO_QUALITY_VALUES as readonly string[]).includes(s) ? (s as PhotoQuality) : undefined
}

export const createUnitSchema = z.object({
  number:         z.string().min(1, 'Unit number is required').max(20),
  floor:          z.number().int().min(0).optional(),
  line:           z.string().max(10).optional(),
  view:           z.string().max(100).optional(),
  type:           z.string().max(50).optional(),
  bedrooms:       z.number().int().min(0).max(20).optional(),
  bathrooms:      z.number().min(0).max(20).optional(),
  bathType:       z.string().max(50).optional(),
  sqft:           z.number().int().min(0).optional(),
  mt2:            z.number().min(0).optional(),
  capacity:       z.number().int().min(1).optional(),
  amenityCap:     z.number().int().min(0).optional(),
  totalBeds:      z.number().int().min(0).optional(),
  kings:          z.number().int().min(0).default(0),
  queens:         z.number().int().min(0).default(0),
  twins:          z.number().int().min(0).default(0),
  otherBeds:      z.string().max(200).optional(),
  hasKitchen:     z.boolean().default(false),
  hasBalcony:     z.boolean().default(false),
  features:       z.array(z.string()).default([]),
  // MVR taxonomy mirrored from Guesty listing custom fields.
  category:       z.string().max(100).optional(),
  typeOfProperty: z.string().max(100).optional(),
  parkingSpot:    z.string().max(100).optional(),
  keyType:        z.string().max(50).optional(),
  ekey:           z.number().int().min(0).optional(),
  mvrPortfolio:   z.boolean().optional(),
  unitTypes:      z.string().max(50).optional(),
  driveFolderUrl: z.string().url().optional().or(z.literal('')),
  photoQuality:   z.enum(PHOTO_QUALITY_VALUES).optional(),
  status:         z.string().min(1).default('onboarding'),
  score:          z.number().min(0).max(10).optional(),
  notes:          z.string().optional(),
  buildingId:     z.string().cuid('Invalid building ID'),
  ownerUniqueId:  z.string().optional(),
})

export const updateUnitSchema = createUnitSchema.partial().omit({ buildingId: true })

export type CreateUnitInput = z.infer<typeof createUnitSchema>
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>
