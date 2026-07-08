// Service layer for user-created Knowledge sections — buckets for OTAs beyond
// the built-in 4 (Airbnb / Booking / Vrbo / Expedia). Sections are purely
// organizational: entries filed under them are stored and shown in the Knowledge
// tab, but are NOT injected into case analysis (see getRelevantKnowledge).

import { type DisputeKnowledgeSection } from '@prisma/client'
import { db } from '@/lib/db'
import { DisputeError } from './cases'
import type { KnowledgeSectionRecord } from './types'

function serialize(s: DisputeKnowledgeSection): KnowledgeSectionRecord {
  return {
    id: s.id,
    label: s.label,
    sortOrder: s.sortOrder,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

export async function listSections(): Promise<KnowledgeSectionRecord[]> {
  const rows = await db.disputeKnowledgeSection.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  })
  return rows.map(serialize)
}

export async function createSection(
  label: string,
  userId: string
): Promise<KnowledgeSectionRecord> {
  // Append to the end of the existing order.
  const max = await db.disputeKnowledgeSection.aggregate({ _max: { sortOrder: true } })
  const row = await db.disputeKnowledgeSection.create({
    data: {
      label: label.trim(),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      createdById: userId,
    },
  })
  return serialize(row)
}

export async function updateSection(
  id: string,
  label: string
): Promise<KnowledgeSectionRecord> {
  const existing = await db.disputeKnowledgeSection.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Knowledge section not found')
  const row = await db.disputeKnowledgeSection.update({
    where: { id },
    data: { label: label.trim() },
  })
  return serialize(row)
}

// Refuses to delete a section that still holds entries — the caller must move or
// remove those sources first. (The FK is onDelete: SetNull as a safety net, but
// silently re-bucketing sources into "General" would be a surprising data move.)
export async function deleteSection(id: string): Promise<void> {
  const existing = await db.disputeKnowledgeSection.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Knowledge section not found')
  const count = await db.disputeKnowledge.count({ where: { sectionId: id } })
  if (count > 0) {
    throw new DisputeError(
      'conflict',
      'Remove or move the sources in this section before deleting it'
    )
  }
  await db.disputeKnowledgeSection.delete({ where: { id } })
}
