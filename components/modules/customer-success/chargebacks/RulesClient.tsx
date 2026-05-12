'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

export interface RuleRow {
  id: string
  name: string
  description: string | null
  criteria: {
    reason?: string
    riskLevel?: 'normal' | 'elevated' | 'highest'
    status?: string
    minAmountCents?: number
  }
  channel: string
  priority: 'normal' | 'high' | 'p1'
  enabled: boolean
  createdAt: string
  createdByName: string | null
}

interface Props {
  initial: RuleRow[]
}

const REASON_OPTIONS = [
  'fraudulent',
  'product_not_received',
  'duplicate',
  'subscription_canceled',
  'credit_not_processed',
  'general',
  'unrecognized',
]

const RISK_LEVELS = ['normal', 'elevated', 'highest'] as const

export function RulesClient({ initial }: Props) {
  const router = useRouter()
  const [rules, setRules] = useState<RuleRow[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    reason: '',
    riskLevel: '',
    minAmountUsd: '',
    channel: '',
    priority: 'normal' as RuleRow['priority'],
    enabled: true,
  })

  function resetForm() {
    setForm({
      name: '',
      description: '',
      reason: '',
      riskLevel: '',
      minAmountUsd: '',
      channel: '',
      priority: 'normal',
      enabled: true,
    })
  }

  async function save() {
    if (!form.name.trim() || !form.channel.trim()) {
      toast.error('Name and channel are required')
      return
    }
    setBusy(true)
    try {
      const criteria: RuleRow['criteria'] = {}
      if (form.reason) criteria.reason = form.reason
      if (form.riskLevel)
        criteria.riskLevel = form.riskLevel as RuleRow['criteria']['riskLevel']
      if (form.minAmountUsd) criteria.minAmountCents = Math.round(Number(form.minAmountUsd) * 100)

      const res = await fetch('/api/v1/risk/rules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          criteria,
          channel: form.channel.trim(),
          priority: form.priority,
          enabled: form.enabled,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Could not create rule')
        return
      }
      setRules((prev) => [
        {
          id: json.data.id,
          name: json.data.name,
          description: json.data.description,
          criteria: json.data.criteria,
          channel: json.data.channel,
          priority: json.data.priority,
          enabled: json.data.enabled,
          createdAt: json.data.createdAt,
          createdByName: json.data.createdBy?.name ?? json.data.createdBy?.email ?? null,
        },
        ...prev,
      ])
      resetForm()
      setShowForm(false)
      toast.success('Rule created')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function toggleEnabled(rule: RuleRow) {
    try {
      const res = await fetch(`/api/v1/risk/rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ enabled: !rule.enabled }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Could not update rule')
        return
      }
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, enabled: !rule.enabled } : r))
      )
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    }
  }

  async function remove(rule: RuleRow) {
    if (!confirm(`Delete rule "${rule.name}"?`)) return
    try {
      const res = await fetch(`/api/v1/risk/rules/${rule.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast.error(json.error ?? 'Could not delete rule')
        return
      }
      setRules((prev) => prev.filter((r) => r.id !== rule.id))
      toast.success('Rule deleted')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    }
  }

  function priorityBadge(p: RuleRow['priority']) {
    if (p === 'p1') return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
    if (p === 'high') return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
    return 'bg-mvr-neutral text-mvr-olive border-[#E0DBD4]'
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {showForm ? 'Cancel' : 'New rule'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5 space-y-4">
          <h3 className="font-display text-lg text-mvr-primary">New alert rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-mvr-primary mb-1 block">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Fraudulent over $2000"
                className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mvr-primary mb-1 block">Slack channel ID</label>
              <input
                type="text"
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                placeholder="C098R8ZMZTL"
                className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-mvr-primary mb-1 block">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="What does this rule catch?"
                className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
              />
            </div>
          </div>

          <div className="border-t border-[#E0DBD4] pt-3">
            <p className="text-xs font-medium text-mvr-primary mb-2">Criteria (any non-empty field is required to match)</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
                >
                  <option value="">Any</option>
                  {REASON_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Risk level</label>
                <select
                  value={form.riskLevel}
                  onChange={(e) => setForm((f) => ({ ...f, riskLevel: e.target.value }))}
                  className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
                >
                  <option value="">Any</option>
                  {RISK_LEVELS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Min amount USD</label>
                <input
                  type="number"
                  value={form.minAmountUsd}
                  onChange={(e) => setForm((f) => ({ ...f, minAmountUsd: e.target.value }))}
                  min={0}
                  step="0.01"
                  placeholder="0"
                  className="w-full text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <label className="text-xs font-medium text-mvr-primary mb-1 block">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as RuleRow['priority'] }))}
                className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="p1">P1</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-mvr-primary mt-5">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                className="accent-mvr-primary"
              />
              Enabled on save
            </label>
            <div className="flex-1" />
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 disabled:opacity-40"
            >
              {busy ? 'Saving…' : 'Save rule'}
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg bg-white">
          No rules defined yet. Click <strong className="text-mvr-primary">New rule</strong> to create the first one.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2.5 px-4 text-left">Name</th>
                <th className="py-2.5 px-3 text-left">Criteria</th>
                <th className="py-2.5 px-3 text-left">Channel</th>
                <th className="py-2.5 px-3 text-left">Priority</th>
                <th className="py-2.5 px-3 text-left">Status</th>
                <th className="py-2.5 px-3 text-left">Created</th>
                <th className="py-2.5 px-4 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const parts: string[] = []
                if (r.criteria.reason) parts.push(`reason=${r.criteria.reason}`)
                if (r.criteria.riskLevel) parts.push(`risk=${r.criteria.riskLevel}`)
                if (r.criteria.status) parts.push(`status=${r.criteria.status}`)
                if (r.criteria.minAmountCents)
                  parts.push(`≥$${(r.criteria.minAmountCents / 100).toFixed(0)}`)
                return (
                  <tr key={r.id} className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-neutral/40">
                    <td className="py-3 px-4">
                      <div className="text-mvr-primary font-medium">{r.name}</div>
                      {r.description && <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>}
                    </td>
                    <td className="py-3 px-3 text-xs text-mvr-olive font-mono">
                      {parts.length === 0 ? '—' : parts.join(' · ')}
                    </td>
                    <td className="py-3 px-3 text-xs font-mono text-mvr-olive">{r.channel}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${priorityBadge(r.priority)}`}>
                        {r.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <button
                        type="button"
                        onClick={() => toggleEnabled(r)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          r.enabled
                            ? 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
                            : 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {r.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(r.createdAt)}
                      {r.createdByName && <div className="text-[10px]">{r.createdByName}</div>}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => remove(r)}
                        className="p-1 rounded hover:bg-mvr-danger-light text-muted-foreground hover:text-mvr-danger transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
