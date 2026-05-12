// Group charges that look like repeated attempts from the same guest.
// Heuristic: group key = normalized guest name + card last 4.
//   - Same name with different cards stays in different groups.
//   - Same card with different names stays in different groups.
//   - Charges with neither name nor card become their own case (singleton).
// Every charge belongs to exactly one ChargeCase. count >= 2 means it's a repeat pattern.

import type { ExpandableCharge } from './ExpandableChargesTable'
import { extractChargeMeta } from './charge-metadata'

export interface ChargeCase {
  key: string
  isGroup: boolean // count >= 2
  primary: ExpandableCharge // most recent attempt
  attempts: ExpandableCharge[] // all attempts, newest first; primary === attempts[0]
  count: number
  totalCents: number
  failedCount: number
  succeededCount: number
  highestRiskCount: number
  elevatedRiskCount: number
  maxRiskLevel: 'highest' | 'elevated' | 'normal' | null
  firstAttempt: Date
  lastAttempt: Date
  guestName: string | null
  email: string | null
  cardLast4: string | null
  cardBrand: string | null
}

function normalizeName(name: string | null): string | null {
  if (!name) return null
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

function asDate(d: Date | string): Date {
  return d instanceof Date ? d : new Date(d)
}

function rankRisk(level: string | null): number {
  if (level === 'highest') return 3
  if (level === 'elevated') return 2
  if (level === 'normal') return 1
  return 0
}

function bestRisk(a: ChargeCase['maxRiskLevel'], b: string | null): ChargeCase['maxRiskLevel'] {
  const rb = rankRisk(b)
  if (rb > rankRisk(a)) return (b as ChargeCase['maxRiskLevel']) ?? a
  return a
}

interface PartialCase {
  key: string
  attempts: Array<{ charge: ExpandableCharge; createdAt: Date }>
  count: number
  totalCents: number
  failedCount: number
  succeededCount: number
  highestRiskCount: number
  elevatedRiskCount: number
  maxRiskLevel: ChargeCase['maxRiskLevel']
  firstAttempt: Date
  lastAttempt: Date
  guestName: string | null
  email: string | null
  cardLast4: string | null
  cardBrand: string | null
}

export function computeCases(charges: ExpandableCharge[]): ChargeCase[] {
  const map = new Map<string, PartialCase>()

  for (const c of charges) {
    const meta = extractChargeMeta(c.raw)
    const normalized = normalizeName(meta.guestName)
    // Can we associate this charge to a guest pattern?
    const groupable = !!(normalized || meta.cardLast4)
    const key = groupable ? `g::${normalized ?? ''}::${meta.cardLast4 ?? ''}` : `s::${c.id}`
    const createdAt = asDate(c.createdAt)

    let p = map.get(key)
    if (!p) {
      p = {
        key,
        attempts: [],
        count: 0,
        totalCents: 0,
        failedCount: 0,
        succeededCount: 0,
        highestRiskCount: 0,
        elevatedRiskCount: 0,
        maxRiskLevel: null,
        firstAttempt: createdAt,
        lastAttempt: createdAt,
        guestName: meta.guestName,
        email: meta.email,
        cardLast4: meta.cardLast4,
        cardBrand: meta.cardBrand,
      }
      map.set(key, p)
    }
    p.attempts.push({ charge: c, createdAt })
    p.count++
    p.totalCents += c.amountCents
    if (c.status === 'failed') p.failedCount++
    if (c.status === 'succeeded') p.succeededCount++
    if (c.riskLevel === 'highest') p.highestRiskCount++
    if (c.riskLevel === 'elevated') p.elevatedRiskCount++
    p.maxRiskLevel = bestRisk(p.maxRiskLevel, c.riskLevel)
    if (createdAt < p.firstAttempt) p.firstAttempt = createdAt
    if (createdAt > p.lastAttempt) p.lastAttempt = createdAt
    if (!p.email && meta.email) p.email = meta.email
    if (!p.guestName && meta.guestName) p.guestName = meta.guestName
  }

  // Finalize: sort attempts newest-first, pick primary, return immutable structure.
  const cases: ChargeCase[] = []
  const partials = Array.from(map.values())
  for (const p of partials) {
    p.attempts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    const attempts = p.attempts.map((a) => a.charge)
    cases.push({
      key: p.key,
      isGroup: p.count >= 2,
      primary: attempts[0],
      attempts,
      count: p.count,
      totalCents: p.totalCents,
      failedCount: p.failedCount,
      succeededCount: p.succeededCount,
      highestRiskCount: p.highestRiskCount,
      elevatedRiskCount: p.elevatedRiskCount,
      maxRiskLevel: p.maxRiskLevel,
      firstAttempt: p.firstAttempt,
      lastAttempt: p.lastAttempt,
      guestName: p.guestName,
      email: p.email,
      cardLast4: p.cardLast4,
      cardBrand: p.cardBrand,
    })
  }
  return cases
}
