import { db } from '@/lib/db'
import { suggestUnit, type UnitLite } from './unit-match'

type CF = { name?: string; value?: unknown }

/** Pull the Guesty "building" custom field value off a Listing.customFields JSON. */
function buildingHint(customFields: unknown): string | null {
  const cf = Array.isArray(customFields) ? (customFields as CF[]) : []
  const v = cf.find((c) => c.name === 'building')?.value
  return typeof v === 'string' ? v : null
}

export interface SuggestionInput {
  id: string
  unitId: string | null
  name: string
  nickname: string | null
  customFields: unknown
}

export interface SuggestionResult {
  suggestedUnitId: string | null
  suggestedUnitLabel: string | null
}

/**
 * Compute a suggested unit for each UNATTACHED listing (attached ones get null),
 * keyed by listing id. Loads the unit index once and reuses it. Used by the
 * listings list page and the paginated listings API so both surfaces agree.
 */
export async function computeUnitSuggestions(
  listings: SuggestionInput[]
): Promise<Map<string, SuggestionResult>> {
  const out = new Map<string, SuggestionResult>()
  const unattached = listings.filter((l) => !l.unitId)
  if (unattached.length === 0) {
    for (const l of listings) out.set(l.id, { suggestedUnitId: null, suggestedUnitLabel: null })
    return out
  }

  const unitsRaw = await db.unit.findMany({
    select: { id: true, number: true, building: { select: { name: true } } },
  })
  const units: UnitLite[] = unitsRaw.map((u) => ({
    id: u.id,
    number: u.number,
    buildingName: u.building?.name ?? null,
  }))

  for (const l of listings) {
    if (l.unitId) {
      out.set(l.id, { suggestedUnitId: null, suggestedUnitLabel: null })
      continue
    }
    const s = suggestUnit({ name: l.nickname || l.name, buildingHint: buildingHint(l.customFields) }, units)
    out.set(l.id, { suggestedUnitId: s?.unitId ?? null, suggestedUnitLabel: s?.label ?? null })
  }
  return out
}
