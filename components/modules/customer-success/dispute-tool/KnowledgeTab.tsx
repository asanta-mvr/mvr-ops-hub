'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Globe, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DISPUTE_OTA_LABELS,
  DISPUTE_OTAS,
  type DisputeCaseTypeT,
  type DisputeOta,
  type KnowledgeRecord,
} from '@/lib/disputes/types'
import {
  useKnowledge,
  useSaveKnowledge,
  useDeleteKnowledge,
  useExtractKnowledge,
  type KnowledgePayload,
} from './useDisputeQueries'
import { OtaIcon } from './OtaIcon'

const INPUT_CLASS =
  'w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive placeholder:text-mvr-steel focus:border-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/20'

const EMPTY: KnowledgePayload = {
  title: '',
  body: '',
  ota: null,
  caseType: null,
  category: null,
  sourceUrl: null,
  enabled: true,
}

function caseTypeLabel(ct: DisputeCaseTypeT | null): string {
  return ct === 'review' ? 'Review' : ct === 'disputa' ? 'Dispute' : 'Any type'
}

interface Props {
  initialKnowledge: KnowledgeRecord[]
}

export function KnowledgeTab({ initialKnowledge }: Props) {
  const { data: entries = [] } = useKnowledge(initialKnowledge)
  const save = useSaveKnowledge()
  const del = useDeleteKnowledge()
  const extract = useExtractKnowledge()

  const [draft, setDraft] = useState<KnowledgePayload | null>(null)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openNew(ota: DisputeOta | null) {
    setUrlOpen(false)
    setDraft({ ...EMPTY, ota })
  }
  function openEdit(k: KnowledgeRecord) {
    setUrlOpen(false)
    setDraft({ id: k.id, title: k.title, body: k.body, ota: k.ota, caseType: k.caseType, category: k.category, sourceUrl: k.sourceUrl, enabled: k.enabled })
  }
  async function runExtract() {
    if (!url.trim()) return
    const d = await extract.mutateAsync(url.trim())
    setDraft({ ...EMPTY, title: d.title, body: d.body, sourceUrl: url.trim() })
    setUrlOpen(false)
    setUrl('')
  }
  async function saveDraft() {
    if (!draft || !draft.title.trim() || !draft.body.trim()) return
    await save.mutateAsync(draft)
    setDraft(null)
  }

  // Group: one bucket per OTA + a "general" bucket for any-OTA entries.
  const groups: Array<{ key: DisputeOta | 'general'; label: string; items: KnowledgeRecord[] }> = [
    ...DISPUTE_OTAS.map((o) => ({
      key: o,
      label: DISPUTE_OTA_LABELS[o],
      items: entries.filter((e) => e.ota === o),
    })),
    { key: 'general', label: 'General (any OTA)', items: entries.filter((e) => e.ota === null) },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-mvr-primary">Knowledge</h2>
          <p className="text-xs text-muted-foreground">
            Reference sources grouped by OTA. Entries matching a case&apos;s OTA + type are injected
            into the analysis.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setDraft(null); setUrlOpen((v) => !v) }}>
          <Globe className="h-3.5 w-3.5" /> Add from URL
        </Button>
      </div>

      {/* Add-from-URL row */}
      {urlOpen ? (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-mvr-steel bg-mvr-cream/60 p-3">
          <input
            className={INPUT_CLASS}
            placeholder="Paste an OTA policy URL (airbnb.com / booking.com / vrbo.com / expedia.com)…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runExtract() } }}
          />
          <Button size="sm" onClick={runExtract} disabled={extract.isPending || !url.trim()}>
            {extract.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Extract
          </Button>
          {extract.isError ? <span className="text-xs text-mvr-danger">{(extract.error as Error).message}</span> : null}
        </div>
      ) : null}

      {/* Draft editor (shared) */}
      {draft ? (
        <div className="space-y-2 rounded-xl border border-mvr-primary/30 bg-white p-4 shadow-card">
          <input className={INPUT_CLASS} placeholder="Title (e.g. Airbnb review-removal policy)" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select className={INPUT_CLASS} value={draft.ota ?? 'any'} onChange={(e) => setDraft({ ...draft, ota: e.target.value === 'any' ? null : (e.target.value as DisputeOta) })}>
              <option value="any">Any OTA</option>
              {DISPUTE_OTAS.map((o) => <option key={o} value={o}>{DISPUTE_OTA_LABELS[o]}</option>)}
            </select>
            <select className={INPUT_CLASS} value={draft.caseType ?? 'any'} onChange={(e) => setDraft({ ...draft, caseType: e.target.value === 'any' ? null : (e.target.value as DisputeCaseTypeT) })}>
              <option value="any">Any case type</option>
              <option value="review">Review removal</option>
              <option value="disputa">OTA dispute</option>
            </select>
            <input className={INPUT_CLASS} placeholder="Category (optional)" value={draft.category ?? ''} onChange={(e) => setDraft({ ...draft, category: e.target.value || null })} />
          </div>
          <textarea className={`${INPUT_CLASS} min-h-[200px] resize-y`} placeholder="The reference content the agent can cite…" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          {draft.sourceUrl ? <p className="truncate text-[11px] text-muted-foreground">Source: {draft.sourceUrl}</p> : null}
          <label className="flex items-center gap-2 text-sm text-mvr-olive">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Enabled (included in analysis)
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveDraft} disabled={save.isPending || !draft.title.trim() || !draft.body.trim()}>
              {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {draft.id ? 'Save changes' : 'Save entry'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
          {save.isError ? <p className="text-xs text-mvr-danger">{(save.error as Error).message}</p> : null}
        </div>
      ) : null}

      {/* OTA-clustered cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key} className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {g.key === 'general' ? (
                  <Globe className="h-5 w-5 text-mvr-steel" />
                ) : (
                  <OtaIcon ota={g.key} className="h-5 w-5" />
                )}
                <h3 className="font-display text-lg text-mvr-primary">{g.label}</h3>
                <span className="rounded-full bg-mvr-neutral px-2 py-0.5 text-[10px] text-muted-foreground">{g.items.length}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => openNew(g.key === 'general' ? null : g.key)}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>

            <div className="space-y-2">
              {g.items.map((k) => {
                const expanded = openIds.has(k.id)
                return (
                  <div key={k.id} className="rounded-lg border border-[#E0DBD4] bg-mvr-cream/40 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" onClick={() => toggleOpen(k.id)} className="flex min-w-0 items-start gap-1.5 text-left">
                        {expanded ? (
                          <ChevronDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mvr-steel" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mvr-steel" />
                        )}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-mvr-primary">{k.title}</span>
                            {!k.enabled ? <span className="rounded-full bg-mvr-neutral px-2 py-0.5 text-[10px] text-muted-foreground">off</span> : null}
                          </span>
                          <span className="block text-[11px] text-muted-foreground">
                            {caseTypeLabel(k.caseType)}{k.category ? ` · ${k.category}` : ''}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 gap-1">
                        <button type="button" onClick={() => openEdit(k)} className="rounded p-1 text-mvr-steel hover:bg-mvr-neutral hover:text-mvr-primary" aria-label="Edit entry"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => del.mutate(k.id)} className="rounded p-1 text-mvr-steel hover:bg-mvr-neutral hover:text-mvr-danger" aria-label="Delete entry"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    {expanded ? (
                      <p className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-mvr-olive">{k.body}</p>
                    ) : null}
                  </div>
                )
              })}
              {g.items.length === 0 ? (
                <p className="text-xs text-muted-foreground">No entries yet.</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
