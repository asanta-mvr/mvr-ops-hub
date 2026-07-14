import type { ListingPhoto } from '@/lib/integrations/guesty'

/**
 * Coerce a stored `Listing.photos` JSON value into a typed, order-sorted
 * `ListingPhoto[]`. db-free, so it's safe to use in any route or component.
 */
export function parseListingPhotos(json: unknown): ListingPhoto[] {
  if (!Array.isArray(json)) return []
  const out: ListingPhoto[] = []
  for (const p of json) {
    if (p && typeof p === 'object') {
      const r = p as Record<string, unknown>
      if (typeof r.id === 'string' && typeof r.src === 'string' && (r.kind === 'guesty' || r.kind === 'drive')) {
        out.push({ id: r.id, kind: r.kind, src: r.src, order: typeof r.order === 'number' ? r.order : 0 })
      }
    }
  }
  return out.sort((a, b) => a.order - b.order)
}

/** Display URL for a stored photo: Guesty CDN URL as-is; Drive fileId via the image proxy. */
export function listingPhotoUrl(p: ListingPhoto): string {
  return p.kind === 'drive' ? `/api/v1/drive/image/${p.src}` : p.src
}

/** Ordered, display-ready photo URLs from a stored `Listing.photos` JSON value. */
export function resolveListingPhotoUrls(json: unknown): string[] {
  return parseListingPhotos(json).map(listingPhotoUrl)
}
