// Service layer for DisputeCase. Routes stay thin: they call these functions,
// serialize for the response, and write audit logs. Status/type validity and the
// per-type default status live here (Prisma can't conditionally default an enum).

import { Prisma, type DisputeCase, type DisputeCaseEvent } from '@prisma/client'
import { db } from '@/lib/db'
import {
  type CaseEventRecord,
  type CaseListItem,
  type ConversationMessage,
  type DisputeCaseStatusT,
  type DisputeCaseTypeT,
  type DisputeOta,
  type DisputeProbs,
  type ReservationMeta,
} from './types'
import { getCaseTypeDef } from './caseTypes'

/** Domain error so routes can map to the right HTTP status. */
export type DisputeErrorCode =
  | 'not_found'
  | 'invalid_status'
  | 'invalid_type'
  | 'invalid_policy_json'
  | 'fetch_failed'
  | 'conflict'

export class DisputeError extends Error {
  constructor(
    public code: DisputeErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'DisputeError'
  }
}

// ─── Serialization (Prisma row → client shape) ───────────────────────────────
// Accepts an optional `createdBy` relation so list queries can surface who
// created/disputed the case; callers that pass a bare row get a null name.
type DisputeCaseWithCreator = DisputeCase & {
  createdBy?: { name: string | null; email: string } | null
}

export function serializeCase(c: DisputeCaseWithCreator): CaseListItem {
  return {
    id: c.id,
    caseType: c.caseType as DisputeCaseTypeT,
    ota: c.ota as DisputeOta,
    status: c.status as DisputeCaseStatusT,
    title: c.title,
    guestName: c.guestName,
    reservationRef: c.reservationRef,
    inputText: c.inputText,
    monto: c.monto,
    cronologia: c.cronologia,
    evidencePaths: Array.isArray(c.evidencePaths) ? (c.evidencePaths as string[]) : [],
    probs: (c.probs as DisputeProbs | null) ?? null,
    resultText: c.resultText,
    outcomeNote: c.outcomeNote,
    reservationMeta: (c.reservationMeta as ReservationMeta | null) ?? null,
    createdByName: c.createdBy ? c.createdBy.name ?? c.createdBy.email : null,
    resolvedAt: c.resolvedAt ? c.resolvedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────
export interface CreateCaseParams {
  caseType: DisputeCaseTypeT
  ota: DisputeOta
  inputText: string
  title?: string
  guestName?: string
  reservationRef?: string
  monto?: string
  cronologia?: string
  evidencePaths?: string[]
  resultText?: string
  probs?: DisputeProbs | null
  reservationMeta?: ReservationMeta | null
  conversationSnapshot?: ConversationMessage[] | null
  createdById: string
}

export async function createCase(params: CreateCaseParams): Promise<DisputeCase> {
  const typeDef = await getCaseTypeDef(params.caseType)
  if (!typeDef) throw new DisputeError('invalid_type', `Unknown case type "${params.caseType}"`)
  return db.disputeCase.create({
    data: {
      caseType: params.caseType,
      ota: params.ota,
      status: typeDef.defaultStatus,
      title: params.title ?? null,
      guestName: params.guestName ?? null,
      reservationRef: params.reservationRef ?? null,
      inputText: params.inputText,
      monto: params.monto ?? null,
      cronologia: params.cronologia ?? null,
      evidencePaths: params.evidencePaths
        ? (params.evidencePaths as unknown as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      resultText: params.resultText ?? null,
      probs: params.probs
        ? (JSON.parse(JSON.stringify(params.probs)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      reservationMeta: params.reservationMeta
        ? (JSON.parse(JSON.stringify(params.reservationMeta)) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      conversationSnapshot:
        params.conversationSnapshot && params.conversationSnapshot.length
          ? (JSON.parse(JSON.stringify(params.conversationSnapshot)) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      createdById: params.createdById,
    },
  })
}

// ─── List ───────────────────────────────────────────────────────────────────
export interface ListCasesFilters {
  status?: DisputeCaseStatusT[]
  ota?: DisputeOta[]
  caseType?: DisputeCaseTypeT[]
}

export async function listCases(filters: ListCasesFilters = {}): Promise<CaseListItem[]> {
  const where: Prisma.DisputeCaseWhereInput = {}
  if (filters.status?.length) where.status = { in: filters.status }
  if (filters.ota?.length) where.ota = { in: filters.ota }
  if (filters.caseType?.length) where.caseType = { in: filters.caseType }

  const rows = await db.disputeCase.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } },
  })
  return rows.map(serializeCase)
}

// Returns just the booking context for one case (used by the inbox endpoint to
// resolve a conversationId without shipping the whole row). Throws not_found.
export async function getCaseReservationMeta(id: string): Promise<ReservationMeta | null> {
  const row = await db.disputeCase.findUnique({
    where: { id },
    select: { reservationMeta: true },
  })
  if (!row) throw new DisputeError('not_found', 'Dispute case not found')
  return (row.reservationMeta as ReservationMeta | null) ?? null
}

// Conversation source for the case detail's Conversation tab. Prefers the frozen
// snapshot captured at create time; returns the conversationId/confirmationCode so
// the endpoint can fall back to a live fetch for older cases without a snapshot.
export async function getCaseConversationSource(id: string): Promise<{
  snapshot: ConversationMessage[] | null
  conversationId: string | null
  confirmationCode: string | null
}> {
  const row = await db.disputeCase.findUnique({
    where: { id },
    select: { conversationSnapshot: true, reservationMeta: true },
  })
  if (!row) throw new DisputeError('not_found', 'Dispute case not found')
  const meta = (row.reservationMeta as ReservationMeta | null) ?? null
  const snapshot = Array.isArray(row.conversationSnapshot)
    ? (row.conversationSnapshot as unknown as ConversationMessage[])
    : null
  return {
    snapshot: snapshot && snapshot.length ? snapshot : null,
    conversationId: meta?.conversationId ?? null,
    confirmationCode: meta?.confirmationCode ?? null,
  }
}

// ─── Resolve / status change ──────────────────────────────────────────────────
export async function resolveCase(params: {
  id: string
  status: DisputeCaseStatusT
  outcomeNote?: string
  userId: string
}): Promise<{ updated: DisputeCase; previous: DisputeCase }> {
  const previous = await db.disputeCase.findUnique({ where: { id: params.id } })
  if (!previous) throw new DisputeError('not_found', 'Dispute case not found')

  const typeDef = await getCaseTypeDef(previous.caseType)
  if (!typeDef) throw new DisputeError('invalid_type', `Unknown case type "${previous.caseType}"`)
  const statusDef = typeDef.statuses.find((s) => s.key === params.status)
  if (!statusDef) {
    throw new DisputeError(
      'invalid_status',
      `Status "${params.status}" is not valid for "${typeDef.label}"`
    )
  }

  const terminal = statusDef.terminal
  const updated = await db.disputeCase.update({
    where: { id: params.id },
    data: {
      status: params.status,
      outcomeNote: params.outcomeNote ?? previous.outcomeNote,
      resolvedAt: terminal ? new Date() : null,
      resolvedById: terminal ? params.userId : null,
    },
  })

  return { updated, previous }
}

// ─── Activity log (History tab) ────────────────────────────────────────────────
type DisputeCaseEventWithCreator = DisputeCaseEvent & {
  createdBy?: { name: string | null; email: string } | null
}

export function serializeEvent(e: DisputeCaseEventWithCreator): CaseEventRecord {
  return {
    id: e.id,
    status: e.status as DisputeCaseStatusT,
    note: e.note,
    createdByName: e.createdBy ? e.createdBy.name ?? e.createdBy.email : null,
    createdAt: e.createdAt.toISOString(),
  }
}

export async function listCaseEvents(caseId: string): Promise<CaseEventRecord[]> {
  const rows = await db.disputeCaseEvent.findMany({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true, email: true } } },
  })
  return rows.map(serializeEvent)
}

// Appends one History entry and (optionally) changes the case status in the same
// transaction. `note` is also mirrored onto the case's outcomeNote so the Tracker
// keeps showing the latest update. When no status is supplied the current status
// is kept (note-only entry). Terminal transitions stamp resolvedAt/resolvedById
// once and clear them on a move back to a non-terminal status.
export async function appendCaseEvent(params: {
  id: string
  status?: DisputeCaseStatusT
  note?: string
  userId: string
}): Promise<{ updated: DisputeCaseWithCreator; event: DisputeCaseEvent }> {
  const previous = await db.disputeCase.findUnique({ where: { id: params.id } })
  if (!previous) throw new DisputeError('not_found', 'Dispute case not found')

  const typeDef = await getCaseTypeDef(previous.caseType)
  if (!typeDef) throw new DisputeError('invalid_type', `Unknown case type "${previous.caseType}"`)
  const nextStatus = params.status ?? (previous.status as DisputeCaseStatusT)
  const statusDef = typeDef.statuses.find((s) => s.key === nextStatus)
  if (!statusDef) {
    throw new DisputeError(
      'invalid_status',
      `Status "${nextStatus}" is not valid for "${typeDef.label}"`
    )
  }

  const terminal = statusDef.terminal
  const [updated, event] = await db.$transaction([
    db.disputeCase.update({
      where: { id: params.id },
      data: {
        status: nextStatus,
        outcomeNote: params.note ?? previous.outcomeNote,
        resolvedAt: terminal ? previous.resolvedAt ?? new Date() : null,
        resolvedById: terminal ? previous.resolvedById ?? params.userId : null,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    db.disputeCaseEvent.create({
      data: {
        caseId: params.id,
        status: nextStatus,
        note: params.note ?? null,
        createdById: params.userId,
      },
    }),
  ])

  return { updated, event }
}
