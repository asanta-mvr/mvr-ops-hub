// Service layer for DisputeCase. Routes stay thin: they call these functions,
// serialize for the response, and write audit logs. Status/type validity and the
// per-type default status live here (Prisma can't conditionally default an enum).

import { Prisma, type DisputeCase } from '@prisma/client'
import { db } from '@/lib/db'
import {
  DEFAULT_STATUS_BY_TYPE,
  isStatusValidForType,
  isTerminalStatus,
  type CaseListItem,
  type DisputeCaseStatusT,
  type DisputeCaseTypeT,
  type DisputeOta,
  type DisputeProbs,
  type ReservationMeta,
} from './types'

/** Domain error so routes can map to the right HTTP status. */
export type DisputeErrorCode =
  | 'not_found'
  | 'invalid_status'
  | 'invalid_policy_json'
  | 'fetch_failed'

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
  createdById: string
}

export async function createCase(params: CreateCaseParams): Promise<DisputeCase> {
  return db.disputeCase.create({
    data: {
      caseType: params.caseType,
      ota: params.ota,
      status: DEFAULT_STATUS_BY_TYPE[params.caseType],
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

// ─── Resolve / status change ──────────────────────────────────────────────────
export async function resolveCase(params: {
  id: string
  status: DisputeCaseStatusT
  outcomeNote?: string
  userId: string
}): Promise<{ updated: DisputeCase; previous: DisputeCase }> {
  const previous = await db.disputeCase.findUnique({ where: { id: params.id } })
  if (!previous) throw new DisputeError('not_found', 'Dispute case not found')

  const caseType = previous.caseType as DisputeCaseTypeT
  if (!isStatusValidForType(caseType, params.status)) {
    throw new DisputeError(
      'invalid_status',
      `Status "${params.status}" is not valid for a "${caseType}" case`
    )
  }

  const terminal = isTerminalStatus(params.status)
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
