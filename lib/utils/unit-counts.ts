/**
 * Calculates unitCount and keyCount from a list of unit numbers.
 *
 * Rule: units that share the same leading-digit "base" (e.g. "1006") are the
 * same home. A home split into keys shows up as split rows under that base
 * (members with a "-" or "/" suffix, e.g. "1006-1"/"1006-2"). So:
 *   - unitCount = number of distinct bases (a split home counts as ONE unit).
 *   - keyCount  = number of split rows under the base; a base with no split
 *                 rows counts as 1 key.
 * Duplicate / letter-suffixed rows (e.g. "2017", "2017b") group under the same
 * numeric base and only add a key if they carry a split suffix.
 *
 * Examples:
 *   ["0901"]                                             → { unitCount: 1, keyCount: 1 }
 *   ["1717", "1717"]                                     → { unitCount: 1, keyCount: 1 }
 *   ["0902", "0902-1", "0902-2"]                         → { unitCount: 1, keyCount: 2 }
 *   ["2017","2017-1","2017-2","2017-01b","2017-02b","2017b"] → { unitCount: 1, keyCount: 4 }
 *   ["0901", "0902-1", "0902-2"]                         → { unitCount: 2, keyCount: 3 }
 */
export function computeUnitAndKeyCount(unitNumbers: string[]): {
  unitCount: number
  keyCount:  number
} {
  // Group unit numbers by their leading-digit base.
  const groups = new Map<string, string[]>()
  for (const num of unitNumbers) {
    const base = baseOf(num)
    if (!groups.has(base)) groups.set(base, [])
    groups.get(base)!.push(num)
  }

  let unitCount = 0
  let keyCount  = 0

  Array.from(groups.values()).forEach((members) => {
    unitCount++ // every base = 1 home

    // Split rows: members carrying a split separator ("-" or "/").
    const splitRows = members.filter((n) => n.includes('-') || n.includes('/'))
    keyCount += splitRows.length > 0 ? splitRows.length : 1
  })

  return { unitCount, keyCount }
}

/**
 * Leading-digit base of a unit number: "1006-1"→"1006", "2017b"→"2017",
 * "1608/09"→"1608", "301"→"301". Falls back to the pre-dash segment for
 * non-numeric numbers (e.g. "PH-A"→"PH").
 */
function baseOf(num: string): string {
  const trimmed = num.trim()
  const digits = trimmed.match(/^\d+/)
  return digits ? digits[0] : trimmed.split('-')[0]
}
