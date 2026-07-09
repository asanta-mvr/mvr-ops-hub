// ═══════════════════════════════════════════════════════════════════════════
// Listing → Unit match suggestion.
//
// Guesty listing names encode the unit ("Arya 0901", building custom field
// "Elser"), but building labels differ from Data Master ("The Elser",
// "Icon Brickell", "District 225") and some listings are multi-unit
// ("1601.1609.1717") or generic ("2 Bedrooms Elser"). This suggests the single
// closest unit for a listing, or null when it can't be confident. Suggestions
// are always human-confirmed before attaching — never auto-applied.
// ═══════════════════════════════════════════════════════════════════════════

export interface UnitLite {
  id: string
  number: string
  buildingName: string | null
}

export interface UnitSuggestion {
  unitId: string
  label: string
}

// Guesty listing building (custom field / name prefix) → Data Master building.
// Keys and values are compared normalized (lowercase, trimmed).
const BUILDING_ALIASES: Record<string, string> = {
  elser: 'the elser',
  icon: 'icon brickell',
  district: 'district 225',
  arya: 'arya',
  natiivo: 'natiivo',
  'private oasis': 'private oasis',
}

const BUILDING_KEYS = Object.keys(BUILDING_ALIASES)

function norm(v: string | null | undefined): string {
  return (v ?? '').trim().toLowerCase()
}

// Comparable variants of a unit number: raw alnum + leading-zeros stripped.
function numberVariants(v: string): Set<string> {
  const alnum = norm(v).replace(/[^a-z0-9]/g, '')
  const noZeros = alnum.replace(/^0+/, '')
  return new Set([alnum, noZeros].filter(Boolean))
}

function numbersMatch(a: string, b: string): boolean {
  const av = numberVariants(a)
  return Array.from(numberVariants(b)).some((v) => av.has(v))
}

// Data Master building name matches the aliased target (equal or contained).
function buildingMatches(unitBuilding: string | null, target: string): boolean {
  const u = norm(unitBuilding)
  if (!u || !target) return false
  return u === target || u.includes(target) || target.includes(u)
}

export interface ParsedListingUnit {
  buildingKey: string | null // normalized building alias key (e.g. "elser")
  number: string | null // the single unit-number token, if unambiguous
  multi: boolean // several unit numbers, or none → not a single-unit listing
}

/**
 * Parse a listing name (+ optional building custom-field hint) into a building
 * key and a single unit number. Unit numbers are 3–4 digit tokens with an
 * optional trailing letter (e.g. 0901, 2504, 1511b), which excludes counts like
 * "2 Bedrooms". More than one such token → multi-unit (no single suggestion).
 */
export function parseListingUnit(name: string, buildingHint?: string | null): ParsedListingUnit {
  const numbers = (name.match(/\d{3,4}[a-z]?/gi) ?? []).map((s) => s.toLowerCase())
  const multi = numbers.length !== 1
  const number = multi ? null : numbers[0]

  let buildingKey: string | null = null
  const hint = norm(buildingHint)
  if (hint && BUILDING_ALIASES[hint]) buildingKey = hint
  else {
    const n = norm(name)
    buildingKey = BUILDING_KEYS.find((k) => n.includes(k)) ?? (hint || null)
  }

  return { buildingKey, number, multi }
}

/** Resolve a parsed building key to the normalized Data Master building name. */
function aliasBuilding(key: string | null): string | null {
  if (!key) return null
  return BUILDING_ALIASES[key] ?? key
}

/**
 * Suggest the single closest unit for a listing, or null when the listing is
 * multi-unit / generic, the building can't be resolved, or the match is
 * ambiguous (more than one candidate).
 */
export function suggestUnit(
  input: { name: string; buildingHint?: string | null },
  units: UnitLite[]
): UnitSuggestion | null {
  const parsed = parseListingUnit(input.name, input.buildingHint)
  if (parsed.multi || !parsed.number) return null

  const target = aliasBuilding(parsed.buildingKey)
  if (!target) return null

  const candidates = units.filter(
    (u) => buildingMatches(u.buildingName, target) && numbersMatch(u.number, parsed.number!)
  )
  if (candidates.length !== 1) return null

  const u = candidates[0]
  return { unitId: u.id, label: `${u.buildingName ? `${u.buildingName} · ` : ''}${u.number}` }
}
