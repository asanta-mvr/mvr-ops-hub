// Shared building-prefix parser. Lives in lib/ so both server (Prisma queries)
// and client (component metadata extraction) can import it.
//
// Real property strings look like "Icon 3901", "Arya 1708-1", "PO 1405-1",
// "Elser 4202 Copia", "Arya PO 1405-1", "Elser Studios 2202", and occasionally
// compact like "icon2201". The building is the alphabetic prefix that ends
// where the unit number starts. Aliases below collapse the same physical
// building when ops uses multiple labels for it.

// Maps each alias we have seen in the data to its canonical building name.
// Entries are case-insensitive (we match on the trimmed lowercased prefix).
const BUILDING_ALIASES: Record<string, string> = {
  'arya po': 'Arya',
  po: 'Arya',
  'elser studios': 'Elser',
}

// Inverted view: for a canonical name, every alias that should match it in SQL.
const CANONICAL_TO_ALIASES: Record<string, string[]> = (() => {
  const out: Record<string, Set<string>> = {}
  for (const [aliasLower, canonical] of Object.entries(BUILDING_ALIASES)) {
    if (!out[canonical]) out[canonical] = new Set([canonical])
    // Preserve display capitalisation by Title-casing the alias.
    out[canonical].add(titleCase(aliasLower))
  }
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, Array.from(v)])
  )
})()

function titleCase(s: string): string {
  return s
    .split(' ')
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(' ')
}

export function canonicalBuilding(parsed: string | null | undefined): string | null {
  if (!parsed) return null
  const trimmed = parsed.trim()
  if (trimmed.length === 0) return null
  return BUILDING_ALIASES[trimmed.toLowerCase()] ?? trimmed
}

// Every alias prefix that belongs to this canonical building. Used to expand
// the SQL `string_starts_with` filter so all variant labels are matched.
export function buildingSources(canonical: string): string[] {
  return CANONICAL_TO_ALIASES[canonical] ?? [canonical]
}

export function extractBuilding(property: string | null | undefined): string | null {
  if (!property) return null
  const cleaned = property.trim()
  const m = cleaned.match(/^([A-Za-z][A-Za-z'\- ]*?)(?=\s*\d|$)/)
  if (!m) return null
  const raw = m[1].trim()
  return raw.length > 0 ? canonicalBuilding(raw) : null
}
