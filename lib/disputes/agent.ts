// Service layer for the Dispute Tool "Agent" tab: the editable analysis context
// (identity/personality with version history, guardrails, and scoped skills).
// Routes stay thin: call these, serialize, audit. No AI here — these settings are
// composed into the analyze system prompt by buildAnalyzeSystemPrompt().

import {
  type DisputeAgentConfig,
  type DisputeAgentVersion,
  type DisputeCaseType,
  type DisputeSkill,
} from '@prisma/client'
import { db } from '@/lib/db'
import { DEFAULT_AGENT_IDENTITY, DEFAULT_BEHAVIOR, DEFAULT_GUARDRAILS } from './prompts'
import { DisputeError } from './cases'
import type {
  AgentConfigRecord,
  AgentVersionRecord,
  DisputeCaseTypeT,
  DisputeOta,
  SkillRecord,
} from './types'

const CONFIG_KEY = 'default'

// ─── Serialization ────────────────────────────────────────────────────────────
function serializeConfig(c: DisputeAgentConfig): AgentConfigRecord {
  return {
    agentName: c.agentName,
    identityPrompt: c.identityPrompt,
    behaviorPrompt: c.behaviorPrompt,
    guardrails: c.guardrails,
    updatedAt: c.updatedAt.toISOString(),
  }
}

function serializeVersion(v: DisputeAgentVersion): AgentVersionRecord {
  return {
    id: v.id,
    agentName: v.agentName,
    identityPrompt: v.identityPrompt,
    behaviorPrompt: v.behaviorPrompt,
    guardrails: v.guardrails,
    note: v.note,
    createdAt: v.createdAt.toISOString(),
  }
}

function serializeSkill(s: DisputeSkill): SkillRecord {
  return {
    id: s.id,
    name: s.name,
    caseType: (s.caseType as DisputeCaseTypeT | null) ?? null,
    ota: (s.ota as DisputeOta | null) ?? null,
    instructions: s.instructions,
    enabled: s.enabled,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }
}

// ─── Config (singleton, lazily created) ───────────────────────────────────────
export async function getAgentConfig(): Promise<DisputeAgentConfig> {
  return db.disputeAgentConfig.upsert({
    where: { key: CONFIG_KEY },
    update: {},
    create: {
      key: CONFIG_KEY,
      identityPrompt: DEFAULT_AGENT_IDENTITY,
      behaviorPrompt: DEFAULT_BEHAVIOR,
      guardrails: DEFAULT_GUARDRAILS,
    },
  })
}

export async function getAgentConfigRecord(): Promise<AgentConfigRecord> {
  return serializeConfig(await getAgentConfig())
}

/** Updates the config AND appends a version snapshot of the new state. */
export async function updateAgentConfig(params: {
  agentName: string
  identityPrompt: string
  behaviorPrompt: string
  guardrails: string[]
  userId: string
  note?: string
}): Promise<AgentConfigRecord> {
  await getAgentConfig() // ensure the singleton exists
  const updated = await db.disputeAgentConfig.update({
    where: { key: CONFIG_KEY },
    data: {
      agentName: params.agentName,
      identityPrompt: params.identityPrompt,
      behaviorPrompt: params.behaviorPrompt,
      guardrails: params.guardrails,
      updatedById: params.userId,
    },
  })
  await db.disputeAgentVersion.create({
    data: {
      agentName: updated.agentName,
      identityPrompt: updated.identityPrompt,
      behaviorPrompt: updated.behaviorPrompt,
      guardrails: updated.guardrails,
      note: params.note ?? null,
      createdById: params.userId,
    },
  })
  return serializeConfig(updated)
}

// ─── Versions ──────────────────────────────────────────────────────────────
export async function listVersions(): Promise<AgentVersionRecord[]> {
  const rows = await db.disputeAgentVersion.findMany({ orderBy: { createdAt: 'desc' }, take: 50 })
  return rows.map(serializeVersion)
}

export async function restoreVersion(id: string, userId: string): Promise<AgentConfigRecord> {
  const v = await db.disputeAgentVersion.findUnique({ where: { id } })
  if (!v) throw new DisputeError('not_found', 'Version not found')
  return updateAgentConfig({
    agentName: v.agentName,
    identityPrompt: v.identityPrompt,
    behaviorPrompt: v.behaviorPrompt,
    guardrails: v.guardrails,
    userId,
    note: `restored from ${id}`,
  })
}

export async function deleteVersion(id: string): Promise<void> {
  const existing = await db.disputeAgentVersion.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Version not found')
  await db.disputeAgentVersion.delete({ where: { id } })
}

// ─── Skills ──────────────────────────────────────────────────────────────────
export interface SkillParams {
  name: string
  caseType?: DisputeCaseTypeT | null
  ota?: DisputeOta | null
  instructions: string
  enabled: boolean
}

export async function listSkills(): Promise<SkillRecord[]> {
  const rows = await db.disputeSkill.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(serializeSkill)
}

export async function createSkill(input: SkillParams, userId: string): Promise<SkillRecord> {
  const row = await db.disputeSkill.create({
    data: {
      name: input.name,
      // Skills scope only to built-ins (review/disputa) — the column is an enum.
      caseType: (input.caseType ?? null) as DisputeCaseType | null,
      ota: input.ota ?? null,
      instructions: input.instructions,
      enabled: input.enabled,
      createdById: userId,
    },
  })
  return serializeSkill(row)
}

export async function updateSkill(id: string, input: SkillParams): Promise<SkillRecord> {
  const existing = await db.disputeSkill.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Skill not found')
  const row = await db.disputeSkill.update({
    where: { id },
    data: {
      name: input.name,
      // Skills scope only to built-ins (review/disputa) — the column is an enum.
      caseType: (input.caseType ?? null) as DisputeCaseType | null,
      ota: input.ota ?? null,
      instructions: input.instructions,
      enabled: input.enabled,
    },
  })
  return serializeSkill(row)
}

export async function deleteSkill(id: string): Promise<void> {
  const existing = await db.disputeSkill.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Skill not found')
  await db.disputeSkill.delete({ where: { id } })
}

/** Enabled skills whose scope matches the case (null scope = any). */
export async function getRelevantSkills(
  caseType: DisputeCaseTypeT,
  ota: DisputeOta
): Promise<Array<{ name: string; instructions: string }>> {
  const rows = await db.disputeSkill.findMany({
    where: {
      enabled: true,
      AND: [
        // DisputeSkill.caseType is an enum (built-ins only); custom types match
        // only the "any case type" (null) skills.
        caseType === 'review' || caseType === 'disputa'
          ? { OR: [{ caseType: null }, { caseType }] }
          : { caseType: null },
        { OR: [{ ota: null }, { ota }] },
      ],
    },
    orderBy: { createdAt: 'asc' },
  })
  return rows.map((s) => ({ name: s.name, instructions: s.instructions }))
}
