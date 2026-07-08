// Service layer for the Dispute Tool "Knowledge" base — tagged reference sources
// (OTA policies, internal notes) the analyzer can cite. Replaces the old Policies
// CMS. Matching entries are injected into the analyze prompt by getRelevantKnowledge.

import { type DisputeCaseType, type DisputeKnowledge } from '@prisma/client'
import { db } from '@/lib/db'
import { DisputeError } from './cases'
import { runKnowledgeExtract } from './anthropic'
import { KNOWLEDGE_EXTRACT_SYSTEM } from './prompts'
import type { DisputeCaseTypeT, DisputeOta, KnowledgeRecord } from './types'

// ─── Injection caps (keep the prompt lean) ────────────────────────────────────
const MAX_ENTRIES = 12
const MAX_BODY_CHARS = 2500
const MAX_TOTAL_CHARS = 12000

// ─── SSRF guard (https-only OTA host allowlist; re-validate redirects) ────────
const HOST_ALLOWLIST = ['airbnb.com', 'booking.com', 'vrbo.com', 'expedia.com']
const FETCH_TIMEOUT_MS = 10_000
const MAX_PAGE_BYTES = 2_000_000
const MAX_REDIRECTS = 3

function assertAllowedUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new DisputeError('fetch_failed', 'Invalid URL')
  }
  if (parsed.protocol !== 'https:') {
    throw new DisputeError('fetch_failed', 'Only https URLs are allowed')
  }
  const host = parsed.hostname.toLowerCase().replace(/\.$/, '')
  const allowed = HOST_ALLOWLIST.some((d) => host === d || host.endsWith(`.${d}`))
  if (!allowed) {
    throw new DisputeError('fetch_failed', `URL host not allowed: ${host}`)
  }
  return parsed
}

async function fetchPageText(url: string): Promise<string> {
  let current = assertAllowedUrl(url).toString()
  for (let hop = 0; ; hop++) {
    let res: Response
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      res = await fetch(current, {
        headers: { 'User-Agent': 'MVR-OpsHub-DisputeTool/1.0 (+knowledge-extractor)' },
        redirect: 'manual',
        signal: controller.signal,
      })
    } catch {
      throw new DisputeError('fetch_failed', `Could not reach ${current}`)
    } finally {
      clearTimeout(timer)
    }
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location')
      if (!location || hop >= MAX_REDIRECTS) {
        throw new DisputeError('fetch_failed', 'Too many or invalid redirects')
      }
      current = assertAllowedUrl(new URL(location, current).toString()).toString()
      continue
    }
    if (!res.ok) throw new DisputeError('fetch_failed', `URL returned ${res.status}`)
    const declared = Number(res.headers.get('content-length') ?? '0')
    if (declared && declared > MAX_PAGE_BYTES) {
      throw new DisputeError('fetch_failed', 'Page is too large')
    }
    const html = (await res.text()).slice(0, MAX_PAGE_BYTES)
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }
}

// ─── Serialization + CRUD ─────────────────────────────────────────────────────
function serialize(k: DisputeKnowledge): KnowledgeRecord {
  return {
    id: k.id,
    title: k.title,
    body: k.body,
    ota: (k.ota as DisputeOta | null) ?? null,
    caseType: (k.caseType as DisputeCaseTypeT | null) ?? null,
    category: k.category,
    sourceUrl: k.sourceUrl,
    enabled: k.enabled,
    sectionId: k.sectionId,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt.toISOString(),
  }
}

export interface KnowledgeParams {
  title: string
  body: string
  ota?: DisputeOta | null
  caseType?: DisputeCaseTypeT | null
  category?: string | null
  sourceUrl?: string | null
  sectionId?: string | null
  enabled: boolean
}

// A custom section and a built-in OTA are mutually exclusive groupings; filing
// an entry under a custom section forces `ota` to null. Throws if the section id
// is unknown (FK would otherwise surface as an opaque 500).
async function resolveGrouping(
  input: KnowledgeParams
): Promise<{ ota: DisputeOta | null; sectionId: string | null }> {
  const sectionId = input.sectionId ?? null
  if (!sectionId) return { ota: input.ota ?? null, sectionId: null }
  const section = await db.disputeKnowledgeSection.findUnique({ where: { id: sectionId } })
  if (!section) throw new DisputeError('not_found', 'Knowledge section not found')
  return { ota: null, sectionId }
}

export async function listKnowledge(): Promise<KnowledgeRecord[]> {
  const rows = await db.disputeKnowledge.findMany({ orderBy: { createdAt: 'desc' } })
  return rows.map(serialize)
}

export async function createKnowledge(input: KnowledgeParams, userId: string): Promise<KnowledgeRecord> {
  const { ota, sectionId } = await resolveGrouping(input)
  const row = await db.disputeKnowledge.create({
    data: {
      title: input.title,
      body: input.body,
      ota,
      caseType: (input.caseType ?? null) as DisputeCaseType | null,
      category: input.category ?? null,
      sourceUrl: input.sourceUrl || null,
      sectionId,
      enabled: input.enabled,
      createdById: userId,
    },
  })
  return serialize(row)
}

export async function updateKnowledge(id: string, input: KnowledgeParams, userId: string): Promise<KnowledgeRecord> {
  const existing = await db.disputeKnowledge.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Knowledge entry not found')
  const { ota, sectionId } = await resolveGrouping(input)
  const row = await db.disputeKnowledge.update({
    where: { id },
    data: {
      title: input.title,
      body: input.body,
      ota,
      caseType: (input.caseType ?? null) as DisputeCaseType | null,
      category: input.category ?? null,
      sourceUrl: input.sourceUrl || null,
      sectionId,
      enabled: input.enabled,
      updatedById: userId,
    },
  })
  return serialize(row)
}

export async function deleteKnowledge(id: string): Promise<void> {
  const existing = await db.disputeKnowledge.findUnique({ where: { id } })
  if (!existing) throw new DisputeError('not_found', 'Knowledge entry not found')
  await db.disputeKnowledge.delete({ where: { id } })
}

/** Enabled entries whose scope matches the case (null scope = any), capped. */
export async function getRelevantKnowledge(
  caseType: DisputeCaseTypeT,
  ota: DisputeOta
): Promise<Array<{ title: string; body: string }>> {
  const rows = await db.disputeKnowledge.findMany({
    where: {
      enabled: true,
      // Custom-section entries are organizational only — never inject them.
      sectionId: null,
      AND: [
        // DisputeKnowledge.caseType is an enum (built-ins only); custom types
        // match only the "any case type" (null) entries.
        caseType === 'review' || caseType === 'disputa'
          ? { OR: [{ caseType: null }, { caseType }] }
          : { caseType: null },
        { OR: [{ ota: null }, { ota }] },
      ],
    },
    orderBy: { createdAt: 'asc' },
    take: MAX_ENTRIES,
  })

  const out: Array<{ title: string; body: string }> = []
  let budget = MAX_TOTAL_CHARS
  for (const r of rows) {
    if (budget <= 0) break
    const body = r.body.slice(0, Math.min(MAX_BODY_CHARS, budget))
    budget -= body.length
    out.push({ title: r.title, body })
  }
  return out
}

// ─── Add from URL (AI extraction → editable draft, not persisted) ─────────────
export async function extractFromUrl(url: string): Promise<{ title: string; body: string }> {
  const pageText = await fetchPageText(url)
  const raw = await runKnowledgeExtract({
    system: KNOWLEDGE_EXTRACT_SYSTEM,
    userText: `URL: ${url}\n\nCONTENIDO DE LA PÁGINA (puede estar truncado):\n${pageText.slice(0, 12000)}`,
  })

  // Parse "TITLE: ...\nBODY:\n..." with a graceful fallback.
  const titleMatch = raw.match(/TITLE:\s*(.+)/i)
  const bodyMatch = raw.match(/BODY:\s*([\s\S]*)/i)
  const title = titleMatch?.[1]?.trim() || new URL(url).hostname
  const body = (bodyMatch?.[1] ?? raw).trim()
  return { title: title.slice(0, 300), body: body.slice(0, 40000) }
}
