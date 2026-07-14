import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { customFieldValue } from '@/lib/data-master/listing-suggestions'
import { resolveListingPhotoUrls, listingPhotoUrl } from '@/lib/data-master/listing-photos'
import { projectListingPhotos } from '@/lib/integrations/guesty'

// A unit's displayed photos come from its attached INDIVIDUAL listing
// (unit_types === "Individual") — never the combined one, and none at all when
// no individual listing is attached. Source priority: the listing's curated
// "approved" set, else its Guesty published photos (the stored raw.pictures
// snapshot from the last sync/push). The unit's own Drive folder stays as an
// internal reference on the unit form but is no longer this gallery's source.
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const unit = await db.unit.findUnique({
    where: { id: params.id },
    select: {
      unitListings: {
        orderBy: { listing: { name: 'asc' } },
        select: { listing: { select: { guestyId: true, customFields: true, photos: true } } },
      },
    },
  })
  if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // First attached listing whose "unit_types" custom field is "Individual"
  // (deterministic by name; nothing enforces a single individual per unit).
  const individual = unit.unitListings
    .map((ul) => ul.listing)
    .find((l) => customFieldValue(l.customFields, 'unit_types')?.toLowerCase() === 'individual')

  let urls: string[] = individual ? resolveListingPhotoUrls(individual.photos) : []

  // Fall back to the listing's Guesty published photos when nothing curated yet.
  if (individual && urls.length === 0 && individual.guestyId) {
    const src = await db.guestyListing.findUnique({
      where: { guestyId: individual.guestyId },
      select: { raw: true },
    })
    if (src?.raw) {
      urls = projectListingPhotos(src.raw as Record<string, unknown>).map(listingPhotoUrl)
    }
  }

  return NextResponse.json({ urls })
}
