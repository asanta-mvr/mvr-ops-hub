// Pure, DB-free helpers for owner/unit document compliance and effective alert
// resolution. Reused by the owner list, preview panel, full profile, the
// compliance dashboard, and the reminder cron. No Prisma imports on purpose —
// callers pass plain shapes so this stays testable and usable on both the
// server components and the cron route.

export type DocScope = 'owner' | 'legal_owner' | 'unit'
export type AlertChannel = 'slack' | 'email'

// 'missing' only applies to a *required* type with no document row.
export type DocStatus = 'on_file' | 'valid' | 'expiring_soon' | 'expired' | 'missing'

export interface DocTypeLite {
  key: string
  label: string
  scope: DocScope
  hasExpiry: boolean
  required: boolean
  active: boolean
}

export interface DocumentLite {
  id: string
  typeKey: string
  ownerId: string | null
  guestyOwnerId?: string | null
  unitId: string | null
  fileUrl: string | null
  issueDate: Date | null
  expireDate: Date | null
}

export interface AlertRuleLite {
  typeKey: string
  enabled: boolean
  leadTimeDays: number[]
  notifyInternal: boolean
  internalChannel: AlertChannel
  internalTarget: string | null
  notifyOwner: boolean
  ownerLeadTimeDays: number[]
}

export interface AlertPrefLite {
  typeKey: string | null // null = applies to all types for this owner
  muted: boolean
  notifyOwner: boolean | null
  leadTimeDays: number[]
}

// Default "expiring soon" window when a type has no configured lead time.
export const DEFAULT_LEAD_DAYS = 30

// Severity ordering for "worst status wins" rollups (higher = worse).
const SEVERITY: Record<DocStatus, number> = {
  expired: 4,
  missing: 3,
  expiring_soon: 2,
  valid: 1,
  on_file: 0,
}

/** Whole-day difference (date - today), ignoring time-of-day, in UTC. */
export function daysUntil(date: Date, today: Date): number {
  const MS_PER_DAY = 86_400_000
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a - b) / MS_PER_DAY)
}

/** Status of a single *present* document (never returns 'missing'). */
export function getDocumentStatus(
  doc: Pick<DocumentLite, 'expireDate'>,
  today: Date,
  leadDays: number = DEFAULT_LEAD_DAYS,
): Exclude<DocStatus, 'missing'> {
  if (!doc.expireDate) return 'on_file'
  const d = daysUntil(doc.expireDate, today)
  if (d < 0) return 'expired'
  if (d <= leadDays) return 'expiring_soon'
  return 'valid'
}

/** Largest configured lead time for a type (used to flag "expiring soon"). */
export function leadDaysForType(typeKey: string, rules?: AlertRuleLite[]): number {
  const rule = rules?.find(r => r.typeKey === typeKey)
  if (rule && rule.leadTimeDays.length > 0) return Math.max(...rule.leadTimeDays)
  return DEFAULT_LEAD_DAYS
}

export interface ComplianceCounts {
  complete: number
  expiringSoon: number
  expired: number
  missing: number
}

export interface ComplianceLine {
  typeKey: string
  label: string
  scope: DocScope
  unitId: string | null // set for unit-scoped lines
  unitNumber: string | null
  legalOwnerId: string | null // set for legal-owner-scoped lines
  legalOwnerName: string | null
  status: DocStatus
  doc: DocumentLite | null
  expireDate: Date | null
}

export interface OwnerCompliance {
  counts: ComplianceCounts
  lines: ComplianceLine[]
  worst: DocStatus | null // null when there is nothing to track
}

interface UnitLite {
  id: string
  number?: string | null
}

/**
 * Roll up compliance for one owner across their owner-scoped documents and all
 * of their units' documents. Owner-scoped required types produce one line;
 * unit-scoped required types produce one line per unit (missing where absent).
 */
export function getComplianceForOwner(input: {
  ownerDocs: DocumentLite[]
  units: UnitLite[]
  unitDocs: DocumentLite[]
  docTypes: DocTypeLite[]
  rules?: AlertRuleLite[]
  today: Date
  legalOwners?: { id: string; name?: string | null }[]
  legalOwnerDocs?: DocumentLite[]
}): OwnerCompliance {
  const { ownerDocs, units, unitDocs, docTypes, rules, today } = input
  const legalOwners = input.legalOwners ?? []
  const legalOwnerDocs = input.legalOwnerDocs ?? []
  const lines: ComplianceLine[] = []
  const activeTypes = docTypes.filter(t => t.active)

  for (const type of activeTypes) {
    const lead = leadDaysForType(type.key, rules)

    if (type.scope === 'owner') {
      const doc = ownerDocs.find(d => d.typeKey === type.key) ?? null
      if (!doc && !type.required) continue
      lines.push({
        typeKey: type.key,
        label: type.label,
        scope: 'owner',
        unitId: null,
        unitNumber: null,
        legalOwnerId: null,
        legalOwnerName: null,
        status: doc ? getDocumentStatus(doc, today, lead) : 'missing',
        doc,
        expireDate: doc?.expireDate ?? null,
      })
    } else if (type.scope === 'legal_owner') {
      // one line per legal owner (LLC)
      for (const lo of legalOwners) {
        const doc = legalOwnerDocs.find(d => d.guestyOwnerId === lo.id && d.typeKey === type.key) ?? null
        if (!doc && !type.required) continue
        lines.push({
          typeKey: type.key,
          label: type.label,
          scope: 'legal_owner',
          unitId: null,
          unitNumber: null,
          legalOwnerId: lo.id,
          legalOwnerName: lo.name ?? null,
          status: doc ? getDocumentStatus(doc, today, lead) : 'missing',
          doc,
          expireDate: doc?.expireDate ?? null,
        })
      }
    } else {
      // unit-scoped → one line per unit
      for (const unit of units) {
        const doc = unitDocs.find(d => d.unitId === unit.id && d.typeKey === type.key) ?? null
        if (!doc && !type.required) continue
        lines.push({
          typeKey: type.key,
          label: type.label,
          scope: 'unit',
          unitId: unit.id,
          unitNumber: unit.number ?? null,
          legalOwnerId: null,
          legalOwnerName: null,
          status: doc ? getDocumentStatus(doc, today, lead) : 'missing',
          doc,
          expireDate: doc?.expireDate ?? null,
        })
      }
    }
  }

  const counts: ComplianceCounts = { complete: 0, expiringSoon: 0, expired: 0, missing: 0 }
  let worst: DocStatus | null = null
  for (const line of lines) {
    if (line.status === 'expired') counts.expired++
    else if (line.status === 'missing') counts.missing++
    else if (line.status === 'expiring_soon') counts.expiringSoon++
    else counts.complete++ // valid | on_file
    if (worst === null || SEVERITY[line.status] > SEVERITY[worst]) worst = line.status
  }

  return { counts, lines, worst }
}

export interface EffectiveAlert {
  enabled: boolean
  muted: boolean
  leadTimeDays: number[]
  notifyInternal: boolean
  internalChannel: AlertChannel
  internalTarget: string | null
  notifyOwner: boolean
  ownerLeadTimeDays: number[]
}

/**
 * Merge a global rule with an optional per-owner override. A muted preference
 * disables the whole rule for that owner; empty override arrays inherit; a null
 * override field inherits the global value.
 */
export function resolveEffectiveAlert(
  rule: AlertRuleLite,
  pref?: AlertPrefLite | null,
): EffectiveAlert {
  const muted = pref?.muted ?? false
  const ownerLead =
    pref?.leadTimeDays && pref.leadTimeDays.length > 0
      ? pref.leadTimeDays
      : rule.ownerLeadTimeDays
  return {
    enabled: rule.enabled && !muted,
    muted,
    leadTimeDays: rule.leadTimeDays,
    notifyInternal: rule.notifyInternal,
    internalChannel: rule.internalChannel,
    internalTarget: rule.internalTarget,
    notifyOwner: pref?.notifyOwner ?? rule.notifyOwner,
    ownerLeadTimeDays: ownerLead,
  }
}
