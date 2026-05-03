/**
 * Calculates unitCount and keyCount from a list of unit numbers.
 *
 * Rule: units that share the same "base" (everything before the first `-`)
 * are considered sub-units of the same master unit.
 *
 * Examples:
 *   ["0901"]                       → { unitCount: 1, keyCount: 1 }
 *   ["0902", "0902-1", "0902-2"]   → { unitCount: 1, keyCount: 2 }
 *   ["0902-1", "0902-2"]           → { unitCount: 1, keyCount: 2 }
 *   ["0901", "0902-1", "0902-2"]   → { unitCount: 2, keyCount: 3 }
 */
export function computeUnitAndKeyCount(unitNumbers: string[]): {
  unitCount: number
  keyCount:  number
} {
  // Group unit numbers by base (the part before the first '-')
  const groups = new Map<string, string[]>()
  for (const num of unitNumbers) {
    const base = num.split('-')[0]
    if (!groups.has(base)) groups.set(base, [])
    groups.get(base)!.push(num)
  }

  let unitCount = 0
  let keyCount  = 0

  Array.from(groups.values()).forEach((members) => {
    unitCount++ // every group = 1 master unit

    // Sub-units are members whose number contains a '-'
    const subUnits = members.filter((n: string) => n.includes('-'))

    if (subUnits.length > 0) {
      // Group has sub-units → keys = number of sub-units (master doesn't add a key)
      keyCount += subUnits.length
    } else {
      // Standalone unit (no sub-units) → 1 key
      keyCount += 1
    }
  })

  return { unitCount, keyCount }
}
