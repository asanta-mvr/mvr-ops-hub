'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  AgentConfigRecord,
  AgentVersionRecord,
  AnalyzeResult,
  CaseListItem,
  ConversationMessage,
  DisputeCaseStatusT,
  DisputeCaseTypeT,
  DisputeOta,
  KnowledgeRecord,
  ReservationMeta,
  SkillRecord,
} from '@/lib/disputes/types'

// ─── fetch helper ─────────────────────────────────────────────────────────────
async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  const json = (await res.json().catch(() => ({}))) as { data?: T; error?: string }
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`)
  return json.data as T
}

// ─── Cases ─────────────────────────────────────────────────────────────────
export interface CaseFilters {
  status?: DisputeCaseStatusT[]
  ota?: DisputeOta[]
  caseType?: DisputeCaseTypeT[]
}

function casesQueryString(filters: CaseFilters): string {
  const qs = new URLSearchParams()
  if (filters.status?.length) qs.set('status', filters.status.join(','))
  if (filters.ota?.length) qs.set('ota', filters.ota.join(','))
  if (filters.caseType?.length) qs.set('caseType', filters.caseType.join(','))
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export function useCases(filters: CaseFilters, initialData?: CaseListItem[]) {
  return useQuery({
    queryKey: ['dispute-cases', filters],
    queryFn: () => jsonFetch<CaseListItem[]>(`/api/v1/disputes/cases${casesQueryString(filters)}`),
    initialData,
  })
}

export interface AnalyzePayload {
  caseType: DisputeCaseTypeT
  ota: DisputeOta
  inputText: string
  title?: string
  guestName?: string
  reservationRef?: string
  monto?: string
  cronologia?: string
  evidencePaths?: string[]
  reservationMeta?: ReservationMeta
}

export function useAnalyze() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AnalyzePayload) =>
      jsonFetch<{ caseId: string } & AnalyzeResult>('/api/v1/disputes/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-cases'] }),
  })
}

export function useResolveCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; status: DisputeCaseStatusT; outcomeNote?: string }) =>
      jsonFetch<CaseListItem>(`/api/v1/disputes/cases/${vars.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: vars.status, outcomeNote: vars.outcomeNote }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-cases'] }),
  })
}

// ─── Case conversation (live inbox fetch) ─────────────────────────────────────
export interface CaseConversation {
  conversationId: string | null
  messages: ConversationMessage[]
}

/** Pulls the structured guest conversation for a case (inbox view in Tracker). */
export function useCaseConversation(caseId: string | null) {
  return useQuery({
    queryKey: ['dispute-case-conversation', caseId],
    queryFn: () => jsonFetch<CaseConversation>(`/api/v1/disputes/cases/${caseId}/conversation`),
    enabled: !!caseId,
    staleTime: 60_000,
  })
}

// ─── Knowledge base ──────────────────────────────────────────────────────────
export interface KnowledgePayload {
  id?: string
  title: string
  body: string
  ota: DisputeOta | null
  caseType: DisputeCaseTypeT | null
  category: string | null
  sourceUrl: string | null
  enabled: boolean
}

export function useKnowledge(initialData?: KnowledgeRecord[]) {
  return useQuery({
    queryKey: ['dispute-knowledge'],
    queryFn: () => jsonFetch<KnowledgeRecord[]>('/api/v1/disputes/knowledge'),
    initialData,
  })
}

export function useSaveKnowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: KnowledgePayload) =>
      jsonFetch<KnowledgeRecord>(
        id ? `/api/v1/disputes/knowledge/${id}` : '/api/v1/disputes/knowledge',
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-knowledge'] }),
  })
}

export function useDeleteKnowledge() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch<{ ok: boolean }>(`/api/v1/disputes/knowledge/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-knowledge'] }),
  })
}

export function useExtractKnowledge() {
  return useMutation({
    mutationFn: (url: string) =>
      jsonFetch<{ title: string; body: string }>('/api/v1/disputes/knowledge/extract', {
        method: 'POST',
        body: JSON.stringify({ url }),
      }),
  })
}

// ─── Agent tab: config + versions + skills ────────────────────────────────────
export interface AgentConfigPayload {
  agentName: string
  identityPrompt: string
  behaviorPrompt: string
  guardrails: string[]
}

export interface SkillPayload {
  id?: string
  name: string
  caseType: DisputeCaseTypeT | null
  ota: DisputeOta | null
  instructions: string
  enabled: boolean
}

export function useAgentConfig(initialData?: AgentConfigRecord) {
  return useQuery({
    queryKey: ['dispute-agent-config'],
    queryFn: () => jsonFetch<AgentConfigRecord>('/api/v1/disputes/agent'),
    initialData,
  })
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AgentConfigPayload) =>
      jsonFetch<AgentConfigRecord>('/api/v1/disputes/agent', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute-agent-config'] })
      qc.invalidateQueries({ queryKey: ['dispute-agent-versions'] })
    },
  })
}

export function useAgentVersions(initialData?: AgentVersionRecord[]) {
  return useQuery({
    queryKey: ['dispute-agent-versions'],
    queryFn: () => jsonFetch<AgentVersionRecord[]>('/api/v1/disputes/agent/versions'),
    initialData,
  })
}

export function useRestoreVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch<AgentConfigRecord>(`/api/v1/disputes/agent/versions/${id}`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dispute-agent-config'] })
      qc.invalidateQueries({ queryKey: ['dispute-agent-versions'] })
    },
  })
}

export function useDeleteVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch<{ ok: boolean }>(`/api/v1/disputes/agent/versions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-agent-versions'] }),
  })
}

export function useSkills(initialData?: SkillRecord[]) {
  return useQuery({
    queryKey: ['dispute-skills'],
    queryFn: () => jsonFetch<SkillRecord[]>('/api/v1/disputes/agent/skills'),
    initialData,
  })
}

export function useSaveSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: SkillPayload) =>
      jsonFetch<SkillRecord>(
        id ? `/api/v1/disputes/agent/skills/${id}` : '/api/v1/disputes/agent/skills',
        { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-skills'] }),
  })
}

export function useDeleteSkill() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      jsonFetch<{ ok: boolean }>(`/api/v1/disputes/agent/skills/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dispute-skills'] }),
  })
}

// ─── Reservation-code lookup (booking + conversation + review) ────────────────
export interface ReservationLookupResult {
  reservation: {
    confirmationCode: string
    ota: string // OtaSource — may be vacasa/other (outside the dispute tool's 4)
    guestName: string | null
    property: string | null
    unit: string | null
    checkinDate: string | null
    checkoutDate: string | null
    checkinAt: string | null
    checkoutAt: string | null
    nights: number | null
    payout: number | null
    adr: number | null
    reservationId: string | null
    conversationId: string | null
    otaReservationId: string | null
    guestId: string | null
  }
  conversation: { transcript: string; messageCount: number } | null
  review: { text: string | null; rating: number | null } | null
}

/** Returns null when the reservation isn't found (404); throws on other errors. */
export async function lookupReservationByCode(
  code: string
): Promise<ReservationLookupResult | null> {
  const res = await fetch(`/api/v1/disputes/lookup?confirmationCode=${encodeURIComponent(code)}`)
  if (res.status === 404) return null
  const json = (await res.json().catch(() => ({}))) as {
    data?: ReservationLookupResult
    error?: string
  }
  if (!res.ok || !json.data) throw new Error(json.error ?? `Lookup failed (${res.status})`)
  return json.data
}

// ─── Evidence upload (multipart — not JSON) ───────────────────────────────────
export async function uploadEvidence(
  draftId: string,
  file: File
): Promise<{ path: string; previewUrl: string }> {
  const form = new FormData()
  form.set('draftId', draftId)
  form.set('file', file)
  const res = await fetch('/api/v1/disputes/evidence', { method: 'POST', body: form })
  const json = (await res.json().catch(() => ({}))) as {
    data?: { path: string; previewUrl: string }
    error?: string
  }
  if (!res.ok || !json.data) throw new Error(json.error ?? `Upload failed (${res.status})`)
  return json.data
}
