import { z } from 'zod'

// Zod schemas for the Dispute Tool. The OTA field is constrained to the 4-value
// subset the tool supports (a subset of the Prisma `OtaSource` enum). Status
// validity against case type is additionally enforced in the service layer
// (lib/disputes/cases.ts), since it depends on the case's stored caseType.

export const disputeOtaEnum = z.enum(['airbnb', 'booking', 'vrbo', 'expedia'])
export const disputeCaseTypeEnum = z.enum(['review', 'disputa'])
export const disputeStatusEnum = z.enum([
  'disputing',
  'removed',
  'notremoved',
  'open',
  'won',
  'lost',
])
export const policySectionEnum = z.enum(['review', 'general'])

// Booking context pulled from the reservation-code lookup (all optional —
// manual cases omit it). Stored on the case and fed into the AI prompt.
export const reservationMetaSchema = z.object({
  confirmationCode: z.string().max(120).nullish(),
  reservationId: z.string().max(120).nullish(),
  otaReservationId: z.string().max(120).nullish(),
  guestId: z.string().max(120).nullish(),
  property: z.string().max(300).nullish(),
  unit: z.string().max(300).nullish(),
  checkinDate: z.string().max(40).nullish(),
  checkoutDate: z.string().max(40).nullish(),
  checkinAt: z.string().max(40).nullish(),
  checkoutAt: z.string().max(40).nullish(),
  nights: z.number().nullish(),
  payout: z.number().nullish(),
  adr: z.number().nullish(),
  conversationText: z.string().max(20000).nullish(),
  reviewText: z.string().max(20000).nullish(),
  reviewRating: z.number().nullish(),
})

// ─── Analyze (POST /api/v1/disputes/analyze) ─────────────────────────────────
export const analyzeInputSchema = z.object({
  caseType: disputeCaseTypeEnum,
  ota: disputeOtaEnum,
  inputText: z.string().min(1, 'Input text is required').max(20000),
  title: z.string().max(200).optional(),
  guestName: z.string().max(200).optional(),
  reservationRef: z.string().max(120).optional(),
  monto: z.string().max(120).optional(), // amount in dispute (OTA disputes only)
  cronologia: z.string().max(8000).optional(), // timeline (OTA disputes only)
  evidencePaths: z.array(z.string().max(500)).max(20).optional(),
  reservationMeta: reservationMetaSchema.optional(),
})

// ─── Manual case create (POST /api/v1/disputes/cases) ─────────────────────────
// Same inputs as analyze, plus optional pre-computed AI output (for cases entered
// without re-running analysis). Status is derived from caseType, not supplied.
export const createCaseSchema = analyzeInputSchema.extend({
  resultText: z.string().max(50000).optional(),
  probs: z.record(z.string(), z.number().int().min(0).max(100)).nullable().optional(),
})

// ─── Resolve / status change (PATCH /api/v1/disputes/cases/[id]/status) ───────
export const updateCaseStatusSchema = z.object({
  status: disputeStatusEnum,
  outcomeNote: z.string().max(5000).optional(),
})

// ─── Policy update (POST /api/v1/disputes/policies/update) ────────────────────
export const policyUpdateSchema = z.object({
  ota: disputeOtaEnum,
  section: policySectionEnum,
  url: z.string().url('A valid policy URL is required'),
})

// Structured JSON the policy-update model must return. Each detail must be a
// short blurb (spec: < 60 words); we enforce a generous char ceiling plus a
// word-count refinement, and cap each array at 8 items.
const policyItemSchema = z.object({
  title: z.string().min(1).max(160),
  detail: z
    .string()
    .min(1)
    .max(600)
    .refine((s) => s.trim().split(/\s+/).length <= 60, 'detail must be under 60 words'),
})

export const policyJsonSchema = z
  .object({
    review: z.array(policyItemSchema).max(8).optional(),
    general_guests: z.array(policyItemSchema).max(8).optional(),
    general_hosts: z.array(policyItemSchema).max(8).optional(),
  })
  .refine(
    (o) => Boolean(o.review || o.general_guests || o.general_hosts),
    'at least one policy section must be present'
  )

// ─── Agent tab (editable analysis context) ───────────────────────────────────
export const agentConfigSchema = z.object({
  agentName: z.string().min(1, 'Agent name is required').max(200),
  identityPrompt: z.string().max(20000),
  behaviorPrompt: z.string().max(20000).default(''),
  guardrails: z.array(z.string().min(1).max(500)).max(50),
})

// caseType / ota are nullable (null = applies to any case type / any OTA).
export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(200),
  caseType: disputeCaseTypeEnum.nullish(),
  ota: disputeOtaEnum.nullish(),
  instructions: z.string().min(1, 'Instructions are required').max(20000),
  enabled: z.boolean().default(true),
})

// ─── Knowledge base (tagged reference sources) ───────────────────────────────
export const knowledgeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  body: z.string().min(1, 'Body is required').max(40000),
  ota: disputeOtaEnum.nullish(),
  caseType: disputeCaseTypeEnum.nullish(),
  category: z.string().max(120).nullish(),
  sourceUrl: z.string().max(1000).nullish(),
  enabled: z.boolean().default(true),
})

export const knowledgeExtractSchema = z.object({
  url: z.string().url('A valid URL is required'),
})

export type KnowledgeInput = z.infer<typeof knowledgeSchema>
export type KnowledgeExtractInput = z.infer<typeof knowledgeExtractSchema>
export type AnalyzeInput = z.infer<typeof analyzeInputSchema>
export type CreateCaseInput = z.infer<typeof createCaseSchema>
export type UpdateCaseStatusInput = z.infer<typeof updateCaseStatusSchema>
export type PolicyUpdateInput = z.infer<typeof policyUpdateSchema>
export type PolicyJsonInput = z.infer<typeof policyJsonSchema>
export type AgentConfigInput = z.infer<typeof agentConfigSchema>
export type SkillInput = z.infer<typeof skillSchema>
