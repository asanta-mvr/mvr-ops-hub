// Service layer for case-type definitions. Two built-ins (review removal / OTA
// dispute) live in code (lib/disputes/types.ts); user-created types live in the
// dispute_case_type_defs table. Reads merge both so callers see one unified list.

import { Prisma, type DisputeCaseTypeDef } from '@prisma/client'
import { db } from '@/lib/db'
import { DisputeError } from './cases'
import { BUILTIN_CASE_TYPES, type CaseStatusDef, type CaseTypeDef } from './types'

function serialize(d: DisputeCaseTypeDef): CaseTypeDef {
  return {
    key: d.key,
    label: d.label,
    statuses: Array.isArray(d.statuses) ? (d.statuses as unknown as CaseStatusDef[]) : [],
    defaultStatus: d.defaultStatus,
    builtIn: false,
  }
}

/** Built-ins first, then custom types in their configured order. */
export async function listCaseTypeDefs(): Promise<CaseTypeDef[]> {
  const rows = await db.disputeCaseTypeDef.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return [...BUILTIN_CASE_TYPES, ...rows.map(serialize)]
}

/** Resolves a single type by key (built-in or custom). Null if unknown. */
export async function getCaseTypeDef(key: string): Promise<CaseTypeDef | null> {
  const builtin = BUILTIN_CASE_TYPES.find((t) => t.key === key)
  if (builtin) return builtin
  const row = await db.disputeCaseTypeDef.findUnique({ where: { key } })
  return row ? serialize(row) : null
}

export interface CaseTypeDefParams {
  label: string
  statuses: CaseStatusDef[]
  defaultStatus: string
}

function slugify(label: string): string {
  const s = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  return s || 'type'
}

export async function createCaseTypeDef(
  input: CaseTypeDefParams,
  userId: string
): Promise<CaseTypeDef> {
  // Generate a stable, unique key (never collides with a built-in or an existing
  // custom type).
  let base = slugify(input.label)
  if (BUILTIN_CASE_TYPES.some((t) => t.key === base)) base = `${base}-custom`
  let key = base
  for (let i = 2; await db.disputeCaseTypeDef.findUnique({ where: { key } }); i++) {
    key = `${base}-${i}`
  }

  const max = await db.disputeCaseTypeDef.aggregate({ _max: { sortOrder: true } })
  const row = await db.disputeCaseTypeDef.create({
    data: {
      key,
      label: input.label.trim(),
      statuses: JSON.parse(JSON.stringify(input.statuses)) as Prisma.InputJsonValue,
      defaultStatus: input.defaultStatus,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      createdById: userId,
    },
  })
  return serialize(row)
}

// Refuses to delete a built-in or a custom type that still has cases — clearing
// those first avoids orphaning cases on a now-undefined type.
export async function deleteCaseTypeDef(key: string): Promise<void> {
  if (BUILTIN_CASE_TYPES.some((t) => t.key === key)) {
    throw new DisputeError('conflict', 'Built-in case types cannot be deleted')
  }
  const row = await db.disputeCaseTypeDef.findUnique({ where: { key } })
  if (!row) throw new DisputeError('not_found', 'Case type not found')
  const count = await db.disputeCase.count({ where: { caseType: key } })
  if (count > 0) {
    throw new DisputeError('conflict', 'This case type has cases — remove them before deleting it')
  }
  await db.disputeCaseTypeDef.delete({ where: { key } })
}
