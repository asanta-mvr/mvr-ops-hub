// ops-hub-side state machine for reviews — Prisma helpers over the
// `review_actions` table. Pairs with `lib/reviews/bq.ts` (which fetches the
// BQ-side review content) via the `(otaSource, externalReviewId)` composite key.
import type { OtaSource, Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import {
  TERMINAL_STATUSES,
  type DisputeStats,
  type ReviewActionPatch,
  type ReviewActionRow,
  type ReviewActionStatus,
} from './types'

export interface ReviewKey {
  otaSource:        OtaSource
  externalReviewId: string
}

// Shape we accept from Prisma — kept narrow so this module stays decoupled
// from the relation-aware generated type.
interface ReviewActionPrisma {
  id:                    string
  otaSource:             OtaSource
  externalReviewId:      string
  status:                string
  assignedToId:          string | null
  disputeDecision:       string | null
  disputeOutcomeNote:    string | null
  internalNotes:         string | null
  escalatedAt:           Date | null
  escalatedById:         string | null
  escalatedSlackChannel: string | null
  firstActionedAt:       Date | null
  closedAt:              Date | null
  disputeScore:          number | null
  disputeAnalysis:       unknown
  aiRecommendation:      string | null
  createdAt:             Date
  updatedAt:             Date
}
type WithAssignee = {
  assignedTo?: { name: string | null; email: string } | null
}

function toRow(r: ReviewActionPrisma & WithAssignee): ReviewActionRow {
  return {
    id:                    r.id,
    otaSource:             r.otaSource,
    externalReviewId:      r.externalReviewId,
    status:                r.status as ReviewActionStatus,
    assignedToId:          r.assignedToId,
    assignedToName:        r.assignedTo?.name ?? r.assignedTo?.email ?? null,
    disputeDecision:       r.disputeDecision,
    disputeOutcomeNote:    r.disputeOutcomeNote,
    internalNotes:         r.internalNotes,
    escalatedAt:           r.escalatedAt?.toISOString() ?? null,
    escalatedById:         r.escalatedById,
    escalatedSlackChannel: r.escalatedSlackChannel,
    firstActionedAt:       r.firstActionedAt?.toISOString() ?? null,
    closedAt:              r.closedAt?.toISOString() ?? null,
    disputeScore:          r.disputeScore ?? null,
    disputeAnalysis:       r.disputeAnalysis ?? null,
    aiRecommendation:      r.aiRecommendation ?? null,
    createdAt:             r.createdAt.toISOString(),
    updatedAt:             r.updatedAt.toISOString(),
  }
}

// Fetch the existing actions for a batch of reviews. Returns a Map keyed
// by `${ota}::${externalReviewId}` for O(1) merge with the BQ rows.
export async function getActionsForReviews(
  keys: ReviewKey[]
): Promise<Map<string, ReviewActionRow>> {
  if (keys.length === 0) return new Map()

  const rows = await db.reviewAction.findMany({
    where: {
      OR: keys.map((k) => ({
        otaSource:        k.otaSource,
        externalReviewId: k.externalReviewId,
      })),
    },
    include: { assignedTo: { select: { name: true, email: true } } },
  })

  const out = new Map<string, ReviewActionRow>()
  for (const r of rows) {
    const serialised = toRow(r as ReviewActionPrisma & WithAssignee)
    out.set(`${serialised.otaSource}::${serialised.externalReviewId}`, serialised)
  }
  return out
}

// Dispute pipeline stats used by the Disputes tab KPI strip. Cheap — one
// groupBy over a small table. `disputedPct` is left null here because it
// requires the BigQuery `Total Reviews` count which the page already has.
export async function getDisputeStats(): Promise<DisputeStats> {
  const ytdStart = new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1))

  const [byStatus, wonYtd, lostYtd, closedYtd] = await Promise.all([
    db.reviewAction.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    db.reviewAction.count({
      where: { status: 'dispute_won', closedAt: { gte: ytdStart } },
    }),
    db.reviewAction.count({
      where: { status: 'dispute_lost', closedAt: { gte: ytdStart } },
    }),
    db.reviewAction.count({
      where: { status: 'closed_no_change', closedAt: { gte: ytdStart } },
    }),
  ])

  const disputingNow = byStatus.find((r) => r.status === 'disputing')?._count._all ?? 0

  const winDenom = wonYtd + lostYtd
  return {
    disputingNow,
    wonYtd,
    lostYtd,
    closedYtd,
    winRate:     winDenom > 0 ? wonYtd / winDenom : null,
    disputedPct: null, // computed at the page using BQ total reviews
  }
}

// Decide which timestamps need to flip on a status transition.
function statusSideEffects(
  prevStatus: ReviewActionStatus | null,
  nextStatus: ReviewActionStatus | undefined,
  now: Date
): { firstActionedAt?: Date; closedAt?: Date | null } {
  if (!nextStatus) return {}
  const out: { firstActionedAt?: Date; closedAt?: Date | null } = {}

  // First non-`new` transition stamps firstActionedAt (one-shot).
  if (prevStatus === 'new' && nextStatus !== 'new') {
    out.firstActionedAt = now
  }
  const wasTerminal    = prevStatus ? TERMINAL_STATUSES.has(prevStatus) : false
  const willBeTerminal = TERMINAL_STATUSES.has(nextStatus)
  if (willBeTerminal && !wasTerminal) out.closedAt = now
  if (!willBeTerminal && wasTerminal) out.closedAt = null
  return out
}

export async function upsertAction(
  patch: ReviewActionPatch,
  userId: string
): Promise<ReviewActionRow> {
  const now = new Date()

  const existing = await db.reviewAction.findUnique({
    where: {
      otaSource_externalReviewId: {
        otaSource:        patch.otaSource,
        externalReviewId: patch.externalReviewId,
      },
    },
  })

  const sideEffects = statusSideEffects(
    (existing?.status as ReviewActionStatus | undefined) ?? null,
    patch.status,
    now
  )

  // Build the update / create payloads — only touch fields the patch carries.
  const data: Prisma.ReviewActionUpdateInput = {}
  if (patch.status !== undefined)             data.status = patch.status
  if (patch.disputeDecision !== undefined)    data.disputeDecision = patch.disputeDecision
  if (patch.disputeOutcomeNote !== undefined) data.disputeOutcomeNote = patch.disputeOutcomeNote
  if (patch.internalNotes !== undefined)      data.internalNotes = patch.internalNotes
  if (patch.assignedToId !== undefined) {
    data.assignedTo = patch.assignedToId
      ? { connect: { id: patch.assignedToId } }
      : { disconnect: true }
  }
  if (sideEffects.firstActionedAt !== undefined && !existing?.firstActionedAt) {
    data.firstActionedAt = sideEffects.firstActionedAt
  }
  if (sideEffects.closedAt !== undefined) data.closedAt = sideEffects.closedAt

  const createData: Prisma.ReviewActionCreateInput = {
    otaSource:          patch.otaSource,
    externalReviewId:   patch.externalReviewId,
    status:             patch.status ?? 'new',
    disputeDecision:    patch.disputeDecision ?? null,
    disputeOutcomeNote: patch.disputeOutcomeNote ?? null,
    internalNotes:      patch.internalNotes ?? null,
    ...(patch.assignedToId ? { assignedTo: { connect: { id: patch.assignedToId } } } : {}),
    ...(sideEffects.firstActionedAt ? { firstActionedAt: sideEffects.firstActionedAt } : {}),
    ...(sideEffects.closedAt        ? { closedAt: sideEffects.closedAt }               : {}),
  }

  const row = await db.reviewAction.upsert({
    where: {
      otaSource_externalReviewId: {
        otaSource:        patch.otaSource,
        externalReviewId: patch.externalReviewId,
      },
    },
    create:  createData,
    update:  data,
    include: { assignedTo: { select: { name: true, email: true } } },
  })

  // Fire-and-forget audit log — never blocks the response (CLAUDE.md hard rule).
  db.auditLog
    .create({
      data: {
        userId,
        action:    existing ? 'UPDATE' : 'CREATE',
        tableName: 'review_actions',
        recordId:  row.id,
        newData:   JSON.parse(JSON.stringify(row)) as Prisma.InputJsonValue,
      },
    })
    .catch((e) => console.error('[audit] review_actions upsert', e))

  return toRow(row as ReviewActionPrisma & WithAssignee)
}
