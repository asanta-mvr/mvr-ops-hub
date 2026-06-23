// Shared types + constants for the Dispute Tool. Mirrors the migration spec
// (MVR_ReviewDisputeTool_MigrationSpec.md) but typed against the MVR stack.
// Source of truth for the OTA subset, case-type/status lifecycles, and the
// shapes exchanged between the API routes and the client.

// ─── OTA subset ──────────────────────────────────────────────────────────────
// The dispute tool only handles 4 of the 6 `OtaSource` enum values. We reuse the
// Prisma enum at the DB layer and constrain to this subset in Zod (see
// lib/validations/dispute.ts) to avoid drift with ReviewAction.
export const DISPUTE_OTAS = ['airbnb', 'booking', 'vrbo', 'expedia'] as const
export type DisputeOta = (typeof DISPUTE_OTAS)[number]

export const DISPUTE_OTA_LABELS: Record<DisputeOta, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  vrbo: 'Vrbo',
  expedia: 'Expedia',
}

// ─── Case type + status lifecycles ─────────────────────────────────────────────
export const DISPUTE_CASE_TYPES = ['review', 'disputa'] as const
export type DisputeCaseTypeT = (typeof DISPUTE_CASE_TYPES)[number]

// review-removal lifecycle
export const REVIEW_STATUSES = ['disputing', 'removed', 'notremoved'] as const
// OTA-dispute lifecycle
export const DISPUTA_STATUSES = ['open', 'won', 'lost'] as const

export const DISPUTE_STATUSES = [...REVIEW_STATUSES, ...DISPUTA_STATUSES] as const
export type DisputeCaseStatusT = (typeof DISPUTE_STATUSES)[number]

// Default status when a case is first created, by case type.
export const DEFAULT_STATUS_BY_TYPE: Record<DisputeCaseTypeT, DisputeCaseStatusT> = {
  review: 'disputing',
  disputa: 'open',
}

// Which statuses are valid for a given case type (enforced in the service layer).
export const STATUSES_BY_TYPE: Record<DisputeCaseTypeT, readonly DisputeCaseStatusT[]> = {
  review: REVIEW_STATUSES,
  disputa: DISPUTA_STATUSES,
}

// A status that closes a case (sets resolvedAt/resolvedById).
export const TERMINAL_STATUSES: readonly DisputeCaseStatusT[] = [
  'removed',
  'notremoved',
  'won',
  'lost',
]

export function isTerminalStatus(status: DisputeCaseStatusT): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export function isStatusValidForType(
  caseType: DisputeCaseTypeT,
  status: DisputeCaseStatusT
): boolean {
  return STATUSES_BY_TYPE[caseType].includes(status)
}

// ─── AI analysis I/O ───────────────────────────────────────────────────────────
// Parsed probability metrics from the [PROB_START]..[PROB_END] block. Keys vary by
// OTA (e.g. REVIEW_REMOVAL, ECONOMIC_DISPUTE, REMOVAL_PROBABILITY, CASE_STRENGTH),
// so this is an open record of UPPER_SNAKE → integer percentage.
export type DisputeProbs = Record<string, number>

export interface AnalyzeResult {
  resultText: string // cleaned markdown
  probs: DisputeProbs | null
}

// The headline win/success metric for a case, picked by case type, for the
// at-a-glance % shown in the Tracker (and case detail header).
const SUCCESS_PROB_ORDER: Record<DisputeCaseTypeT, string[]> = {
  review: ['REVIEW_REMOVAL', 'REMOVAL_PROBABILITY', 'CASE_STRENGTH'],
  disputa: ['ECONOMIC_DISPUTE', 'CASE_STRENGTH', 'REMOVAL_PROBABILITY'],
}
const SUCCESS_PROB_LABELS: Record<string, string> = {
  REVIEW_REMOVAL: 'Removal',
  REMOVAL_PROBABILITY: 'Removal',
  ECONOMIC_DISPUTE: 'Win',
  CASE_STRENGTH: 'Strength',
}

export function successProb(
  probs: DisputeProbs | null,
  caseType: DisputeCaseTypeT
): { label: string; value: number } | null {
  if (!probs) return null
  for (const key of SUCCESS_PROB_ORDER[caseType]) {
    if (typeof probs[key] === 'number') {
      return { label: SUCCESS_PROB_LABELS[key] ?? key, value: probs[key] }
    }
  }
  const first = Object.entries(probs).find(([, v]) => typeof v === 'number')
  return first ? { label: 'Success', value: first[1] } : null
}

// ─── Guest conversation (inbox view) ─────────────────────────────────────────
// One rendered message from guesty.conversation_posts. `sentBy` is the direction
// signal (guest → left, host → right, log → centered system note). Pulled live
// for the case detail; not persisted on the case (only a flat transcript is).
export type ConversationSender = 'guest' | 'host' | 'log'

export interface ConversationMessage {
  id: string
  sentBy: ConversationSender
  userName: string | null // host agent name on manual messages, else null
  channel: string | null // module.type (airbnb2/sms/email/homeaway2/expedia/…)
  body: string
  createdAt: string // ISO timestamp
  isAutomatic: boolean // workflow/automated host message
}

// Maps Guesty's raw module.type channels to friendly labels for the inbox badge.
export const CONVERSATION_CHANNEL_LABELS: Record<string, string> = {
  airbnb2: 'Airbnb',
  airbnb: 'Airbnb',
  homeaway2: 'Vrbo',
  homeaway: 'Vrbo',
  bookingCom: 'Booking',
  expedia: 'Expedia',
  sms: 'SMS',
  email: 'Email',
  whatsapp: 'WhatsApp',
}

export function conversationChannelLabel(channel: string | null): string | null {
  if (!channel) return null
  return CONVERSATION_CHANNEL_LABELS[channel] ?? channel
}

// ─── Policies ──────────────────────────────────────────────────────────────────
export const POLICY_SECTIONS = ['review', 'general'] as const
export type PolicySection = (typeof POLICY_SECTIONS)[number]

export interface PolicyItem {
  title: string
  detail: string
}

// Structured JSON the policy-update model returns. Only the relevant keys are
// populated per section (review → `review`; general → guests + hosts).
export interface PolicyJson {
  review?: PolicyItem[]
  general_guests?: PolicyItem[]
  general_hosts?: PolicyItem[]
}

// ─── Reservation context (pulled from BigQuery via the code lookup) ──────────
export interface ReservationMeta {
  confirmationCode?: string | null
  reservationId?: string | null
  otaReservationId?: string | null
  guestId?: string | null
  conversationId?: string | null // Guesty conversation id (for the inbox re-fetch)
  property?: string | null
  unit?: string | null
  checkinDate?: string | null
  checkoutDate?: string | null
  checkinAt?: string | null // ISO timestamp (date + time)
  checkoutAt?: string | null
  nights?: number | null
  payout?: number | null // total accommodation fare
  adr?: number | null // payout ÷ nights
  conversationText?: string | null // transcript snapshot pulled at analyze time
  reviewText?: string | null // review snapshot pulled at analyze time
  reviewRating?: number | null
}

// ─── Client-facing shapes ────────────────────────────────────────────────────
// Serializable case row for the Tracker (Dates → ISO strings).
export interface CaseListItem {
  id: string
  caseType: DisputeCaseTypeT
  ota: DisputeOta
  status: DisputeCaseStatusT
  title: string | null
  guestName: string | null
  reservationRef: string | null
  inputText: string
  monto: string | null
  cronologia: string | null
  evidencePaths: string[]
  probs: DisputeProbs | null
  resultText: string | null
  outcomeNote: string | null
  reservationMeta: ReservationMeta | null
  createdByName: string | null // who created/disputed the case
  resolvedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PolicyRecord {
  ota: DisputeOta
  section: PolicySection
  contentJson: PolicyJson
  contentHtml: string
  sourceUrl: string | null
  updatedAt: string
}

// ─── Agent tab (editable analysis context) ───────────────────────────────────
export interface AgentConfigRecord {
  agentName: string
  identityPrompt: string
  behaviorPrompt: string
  guardrails: string[]
  updatedAt: string
}

export interface AgentVersionRecord {
  id: string
  agentName: string
  identityPrompt: string
  behaviorPrompt: string
  guardrails: string[]
  note: string | null
  createdAt: string
}

export interface SkillRecord {
  id: string
  name: string
  caseType: DisputeCaseTypeT | null // null = any case type
  ota: DisputeOta | null // null = any OTA
  instructions: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface KnowledgeRecord {
  id: string
  title: string
  body: string
  ota: DisputeOta | null // null = any OTA
  caseType: DisputeCaseTypeT | null // null = any case type
  category: string | null
  sourceUrl: string | null
  enabled: boolean
  createdAt: string
  updatedAt: string
}
