import { z } from 'zod'

// A URL field that accepts a valid URL, an empty string (cleared), or null.
const urlOrEmpty = z.string().url().or(z.literal('')).nullable().optional()

// Editable Data Master fields on a Listing. Unit attachment is managed from the
// unit side (POST/DELETE /api/v1/units/:id/listings) since a listing can span
// multiple units. Guesty-derived read-only detail is rendered from
// GuestyListing.raw, not here.
export const updateListingSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  nickname: z.string().max(200).nullable().optional(),
  sqrFeet: z.number().int().nonnegative().nullable().optional(),
  totalOccupancy: z.number().int().nonnegative().nullable().optional(),
  liveDate: z.coerce.date().nullable().optional(),
  urlAirbnb: urlOrEmpty,
  urlBooking: urlOrEmpty,
  urlVrbo: urlOrEmpty,
  urlExpedia: urlOrEmpty,
  urlVacasa: urlOrEmpty,
})

export type UpdateListingInput = z.infer<typeof updateListingSchema>
