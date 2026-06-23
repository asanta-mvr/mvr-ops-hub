'use client'

import { useEffect, useState } from 'react'
import {
  Brain,
  ChevronDown,
  ChevronRight,
  Gauge,
  History,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  SlidersHorizontal,
  Trash2,
  Wand2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DISPUTE_OTA_LABELS,
  DISPUTE_OTAS,
  type AgentConfigRecord,
  type AgentVersionRecord,
  type DisputeCaseTypeT,
  type DisputeOta,
  type SkillRecord,
} from '@/lib/disputes/types'
import {
  useAgentConfig,
  useAgentVersions,
  useDeleteSkill,
  useDeleteVersion,
  useRestoreVersion,
  useSaveSkill,
  useSkills,
  useUpdateAgentConfig,
  type SkillPayload,
} from './useDisputeQueries'

const INPUT_CLASS =
  'w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive placeholder:text-mvr-steel focus:border-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/20'

type Section = 'identity' | 'behavior' | 'skills' | 'memory'

const NAV: Array<{ id: Section; label: string; icon: LucideIcon }> = [
  { id: 'identity', label: 'Identity', icon: SlidersHorizontal },
  { id: 'behavior', label: 'Behavior', icon: Gauge },
  { id: 'skills', label: 'Skills', icon: Wand2 },
  { id: 'memory', label: 'Memory', icon: Brain },
]

interface Props {
  initialConfig: AgentConfigRecord
  initialVersions: AgentVersionRecord[]
  initialSkills: SkillRecord[]
}

function scopeLabel(s: SkillRecord): string {
  const ct = s.caseType === 'review' ? 'Review' : s.caseType === 'disputa' ? 'Dispute' : 'Any type'
  const ota = s.ota ? DISPUTE_OTA_LABELS[s.ota] : 'Any OTA'
  return `${ct} · ${ota}`
}

export function AgentTab({ initialConfig, initialVersions, initialSkills }: Props) {
  const [section, setSection] = useState<Section>('identity')
  const { data: config } = useAgentConfig(initialConfig)
  const { data: versions = [] } = useAgentVersions(initialVersions)
  const updateConfig = useUpdateAgentConfig()
  const restore = useRestoreVersion()
  const del = useDeleteVersion()

  // Shared editable draft — every config save persists the full set.
  const [agentName, setAgentName] = useState(initialConfig.agentName)
  const [identityPrompt, setIdentityPrompt] = useState(initialConfig.identityPrompt)
  const [behaviorPrompt, setBehaviorPrompt] = useState(initialConfig.behaviorPrompt)
  const [guardrails, setGuardrails] = useState<string[]>(initialConfig.guardrails)
  const [newGuardrail, setNewGuardrail] = useState('')
  const [showVersions, setShowVersions] = useState(false)

  // Re-sync the draft when the server config changes (e.g. after a restore).
  useEffect(() => {
    if (!config) return
    setAgentName(config.agentName)
    setIdentityPrompt(config.identityPrompt)
    setBehaviorPrompt(config.behaviorPrompt)
    setGuardrails(config.guardrails)
  }, [config])

  function saveConfig() {
    updateConfig.mutate({ agentName, identityPrompt, behaviorPrompt, guardrails })
  }
  function addGuardrail() {
    const v = newGuardrail.trim()
    if (!v || guardrails.includes(v)) return
    setGuardrails((prev) => [...prev, v])
    setNewGuardrail('')
  }

  const SaveButton = ({ label = 'Save' }: { label?: string }) => (
    <div className="flex items-center gap-2">
      <Button onClick={saveConfig} disabled={updateConfig.isPending}>
        {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {label}
      </Button>
      {updateConfig.isError ? <span className="text-sm text-mvr-danger">{(updateConfig.error as Error).message}</span> : null}
    </div>
  )

  return (
    <div className="grid gap-4 md:grid-cols-[200px_1fr]">
      {/* Left settings sub-nav */}
      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-[#E0DBD4] bg-white p-2 shadow-card md:flex-col md:overflow-visible">
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${
              section === id
                ? 'bg-mvr-primary-light font-medium text-mvr-primary'
                : 'text-mvr-olive hover:bg-mvr-neutral'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Right pane — active section */}
      <div className="space-y-4">
        {/* ── Identity ───────────────────────────────────────────────── */}
        {section === 'identity' ? (
          <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg text-mvr-primary">Identity &amp; Personality</h3>
                <p className="text-xs text-muted-foreground">Who the analyzer is. Each Save creates a version.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowVersions((v) => !v)}>
                <History className="h-3.5 w-3.5" />
                {versions.length} version{versions.length === 1 ? '' : 's'}
              </Button>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Agent name</label>
              <input className={INPUT_CLASS} value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Dispute Adjudicator" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Personality &amp; instructions</label>
              <textarea
                className={`${INPUT_CLASS} min-h-[240px] resize-y`}
                value={identityPrompt}
                onChange={(e) => setIdentityPrompt(e.target.value)}
                placeholder="Describe who this agent is and how it should reason about cases…"
              />
            </div>
            <SaveButton />

            {showVersions ? <VersionsPanel versions={versions} variant="identity" restore={restore} del={del} /> : null}
          </div>
        ) : null}

        {/* ── Behavior ───────────────────────────────────────────────── */}
        {section === 'behavior' ? (
          <>
            <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-mvr-primary">Behavior &amp; Formatting</h3>
                  <p className="text-xs text-muted-foreground">Procedural rules for how the analysis is structured and worded.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowVersions((v) => !v)}>
                  <History className="h-3.5 w-3.5" />
                  {versions.length} version{versions.length === 1 ? '' : 's'}
                </Button>
              </div>
              <textarea
                className={`${INPUT_CLASS} min-h-[200px] resize-y`}
                value={behaviorPrompt}
                onChange={(e) => setBehaviorPrompt(e.target.value)}
                placeholder="e.g. Keep the verdict to 2–3 sentences. Always cite the policy clause…"
              />
              {showVersions ? <VersionsPanel versions={versions} variant="behavior" restore={restore} del={del} /> : null}
            </div>

            <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
              <div>
                <h3 className="font-display text-lg text-mvr-primary">Response guardrails</h3>
                <p className="text-xs text-muted-foreground">Hard rules the analyzer must never break.</p>
              </div>
              <div className="space-y-2">
                {guardrails.map((g) => (
                  <div key={g} className="flex items-start justify-between gap-2 rounded-lg bg-mvr-sand-light px-3 py-2">
                    <span className="text-sm text-mvr-olive">{g}</span>
                    <button type="button" onClick={() => setGuardrails((prev) => prev.filter((x) => x !== g))} className="mt-0.5 text-mvr-steel hover:text-mvr-danger" aria-label="Remove guardrail">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {guardrails.length === 0 ? <p className="text-xs text-muted-foreground">No guardrails yet.</p> : null}
              </div>
              <div className="flex items-center gap-2">
                <input
                  className={INPUT_CLASS}
                  value={newGuardrail}
                  onChange={(e) => setNewGuardrail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGuardrail() } }}
                  placeholder="Add a guardrail (e.g. Never invent policies)…"
                />
                <Button variant="outline" size="sm" onClick={addGuardrail} disabled={!newGuardrail.trim()}>
                  <Plus className="h-3.5 w-3.5" /> Add
                </Button>
              </div>
            </div>

            <SaveButton label="Save behavior" />
          </>
        ) : null}

        {/* ── Skills ─────────────────────────────────────────────────── */}
        {section === 'skills' ? <SkillsCard initialSkills={initialSkills} /> : null}

        {/* ── Memory (placeholder) ───────────────────────────────────── */}
        {section === 'memory' ? (
          <div className="rounded-xl border border-dashed border-[#E0DBD4] bg-mvr-cream/40 p-8 text-center shadow-card">
            <Brain className="mx-auto mb-2 h-7 w-7 text-mvr-steel" />
            <h3 className="font-display text-lg text-mvr-primary">Agent memory</h3>
            <p className="mt-1 text-xs text-muted-foreground">Coming soon — durable learnings the agent carries between cases.</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ─── Versions panel (shared by Identity + Behavior) ──────────────────────────
function VersionsPanel({
  versions,
  variant,
  restore,
  del,
}: {
  versions: AgentVersionRecord[]
  variant: 'identity' | 'behavior'
  restore: ReturnType<typeof useRestoreVersion>
  del: ReturnType<typeof useDeleteVersion>
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (versions.length === 0) {
    return <p className="text-xs text-muted-foreground">No versions yet — your first Save creates one.</p>
  }

  return (
    <div className="space-y-2 rounded-lg border border-[#E0DBD4] bg-mvr-cream/50 p-3">
      {versions.map((v) => {
        const expanded = openId === v.id
        const snapshot =
          variant === 'identity'
            ? `Agent name: ${v.agentName}\n\n${v.identityPrompt || '(empty)'}`
            : `${v.behaviorPrompt || '(empty)'}${
                v.guardrails.length ? `\n\nGuardrails:\n${v.guardrails.map((g) => `- ${g}`).join('\n')}` : ''
              }`
        return (
          <div key={v.id} className="border-b border-[#E0DBD4] pb-2 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpenId(expanded ? null : v.id)}
                className="flex min-w-0 items-center gap-1.5 text-left"
              >
                {expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 text-mvr-steel" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-mvr-steel" />
                )}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-mvr-olive">{v.agentName}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {new Date(v.createdAt).toLocaleString()}
                    {v.note ? ` · ${v.note}` : ''}
                  </span>
                </span>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="sm" disabled={restore.isPending} onClick={() => restore.mutate(v.id)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                </Button>
                <button
                  type="button"
                  disabled={del.isPending}
                  onClick={() => del.mutate(v.id)}
                  className="rounded p-1 text-mvr-steel hover:bg-mvr-neutral hover:text-mvr-danger disabled:opacity-50"
                  aria-label="Delete version"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            {expanded ? (
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 font-sans text-xs text-mvr-olive">
                {snapshot}
              </pre>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

// ─── Skills card ──────────────────────────────────────────────────────────────
const EMPTY_SKILL: SkillPayload = { name: '', caseType: null, ota: null, instructions: '', enabled: true }

function SkillsCard({ initialSkills }: { initialSkills: SkillRecord[] }) {
  const { data: skills = [] } = useSkills(initialSkills)
  const saveSkill = useSaveSkill()
  const deleteSkill = useDeleteSkill()
  const [draft, setDraft] = useState<SkillPayload | null>(null) // null = form closed

  function openNew() { setDraft({ ...EMPTY_SKILL }) }
  function openEdit(s: SkillRecord) {
    setDraft({ id: s.id, name: s.name, caseType: s.caseType, ota: s.ota, instructions: s.instructions, enabled: s.enabled })
  }
  async function save() {
    if (!draft || !draft.name.trim() || !draft.instructions.trim()) return
    await saveSkill.mutateAsync(draft)
    setDraft(null)
  }

  return (
    <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-mvr-primary">Skills</h3>
          <p className="text-xs text-muted-foreground">Playbooks injected when a case matches their scope (case type / OTA).</p>
        </div>
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="h-3.5 w-3.5" /> Add skill
        </Button>
      </div>

      <div className="space-y-2">
        {skills.map((s) => (
          <div key={s.id} className="rounded-lg border border-[#E0DBD4] p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-mvr-primary">{s.name}</span>
                  {!s.enabled ? <span className="rounded-full bg-mvr-neutral px-2 py-0.5 text-[10px] text-muted-foreground">disabled</span> : null}
                </div>
                <div className="text-[11px] text-muted-foreground">{scopeLabel(s)}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => openEdit(s)} className="rounded p-1 text-mvr-steel hover:bg-mvr-neutral hover:text-mvr-primary" aria-label="Edit skill"><Pencil className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => deleteSkill.mutate(s.id)} className="rounded p-1 text-mvr-steel hover:bg-mvr-neutral hover:text-mvr-danger" aria-label="Delete skill"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
            <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-xs text-mvr-olive">{s.instructions}</p>
          </div>
        ))}
        {skills.length === 0 ? <p className="text-xs text-muted-foreground">No skills yet.</p> : null}
      </div>

      {draft ? (
        <div className="space-y-2 rounded-lg border border-dashed border-mvr-steel bg-mvr-cream/60 p-3">
          <input className={INPUT_CLASS} placeholder="Skill name (e.g. Review removal playbook)" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <select
              className={INPUT_CLASS}
              value={draft.caseType ?? 'any'}
              onChange={(e) => setDraft({ ...draft, caseType: e.target.value === 'any' ? null : (e.target.value as DisputeCaseTypeT) })}
            >
              <option value="any">Any case type</option>
              <option value="review">Review removal</option>
              <option value="disputa">OTA dispute</option>
            </select>
            <select
              className={INPUT_CLASS}
              value={draft.ota ?? 'any'}
              onChange={(e) => setDraft({ ...draft, ota: e.target.value === 'any' ? null : (e.target.value as DisputeOta) })}
            >
              <option value="any">Any OTA</option>
              {DISPUTE_OTAS.map((o) => <option key={o} value={o}>{DISPUTE_OTA_LABELS[o]}</option>)}
            </select>
          </div>
          <textarea className={`${INPUT_CLASS} min-h-[110px] resize-y`} placeholder="Instructions for this skill…" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          <label className="flex items-center gap-2 text-sm text-mvr-olive">
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
            Enabled
          </label>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={save} disabled={saveSkill.isPending || !draft.name.trim() || !draft.instructions.trim()}>
              {saveSkill.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {draft.id ? 'Save changes' : 'Add skill'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
          </div>
          {saveSkill.isError ? <p className="text-xs text-mvr-danger">{(saveSkill.error as Error).message}</p> : null}
        </div>
      ) : null}
    </div>
  )
}
