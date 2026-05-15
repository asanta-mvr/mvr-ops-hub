'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Power } from 'lucide-react'
import { RESOURCES, type Level, type Resource } from '@/lib/auth/resources'

type Selection = Record<Resource, Level | 'none'>

interface Props {
  userId: string
  email: string
  name: string | null
  isActive: boolean
  isSelf: boolean
  isSuperAdmin: boolean
  initialPermissions: Array<{ resource: string; level: string }>
}

function buildInitialSelection(perms: Array<{ resource: string; level: string }>): Selection {
  const base: Record<string, Level | 'none'> = {}
  for (const r of RESOURCES) base[r.key] = 'none'
  for (const p of perms) {
    if (p.level === 'view' || p.level === 'edit') {
      base[p.resource] = p.level
    }
  }
  return base as Selection
}

export function UserPermissionsForm({
  userId,
  email,
  name,
  isActive,
  isSelf,
  isSuperAdmin,
  initialPermissions,
}: Props) {
  const router = useRouter()
  const [selection, setSelection] = useState<Selection>(() =>
    buildInitialSelection(initialPermissions)
  )
  const [active, setActive] = useState(isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof RESOURCES[number][]>()
    for (const r of RESOURCES) {
      const list = groups.get(r.group) ?? []
      list.push(r)
      groups.set(r.group, list)
    }
    return Array.from(groups.entries())
  }, [])

  const totalCount = Object.values(selection).filter((v) => v !== 'none').length
  const editCount = Object.values(selection).filter((v) => v === 'edit').length
  const dirty = useMemo(() => {
    const initial = buildInitialSelection(initialPermissions)
    for (const r of RESOURCES) if (initial[r.key] !== selection[r.key]) return true
    return false || active !== isActive
  }, [selection, active, initialPermissions, isActive])

  function setOne(resource: Resource, level: Level | 'none') {
    setSelection((s) => ({ ...s, [resource]: level }))
  }

  function setGroup(group: string, level: Level | 'none') {
    setSelection((s) => {
      const next = { ...s }
      for (const r of RESOURCES) {
        if (r.group === group) next[r.key] = level
      }
      return next
    })
  }

  async function onSave() {
    if (isSelf && !isSuperAdmin) {
      setError("You can't edit your own permissions.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      // 1. Persist permissions
      const permissions = (Object.entries(selection) as Array<[Resource, Level | 'none']>)
        .filter(([, level]) => level !== 'none')
        .map(([resource, level]) => ({ resource, level }))
      const permRes = await fetch(`/api/v1/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      })
      if (!permRes.ok) {
        const body = await permRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Permissions save failed (${permRes.status})`)
      }
      // 2. Update active flag if changed
      if (active !== isActive) {
        const userRes = await fetch(`/api/v1/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: active }),
        })
        if (!userRes.ok) {
          const body = await userRes.json().catch(() => ({}))
          throw new Error(body.error ?? `Account update failed (${userRes.status})`)
        }
      }
      setSavedAt(Date.now())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* User card */}
      <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-mvr-primary">{name ?? email}</h1>
          {name && <p className="text-sm text-muted-foreground font-mono">{email}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {totalCount} resource{totalCount === 1 ? '' : 's'} granted ·{' '}
            {editCount} with edit access
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">Account</span>
          <button
            type="button"
            onClick={() => setActive((a) => !a)}
            disabled={isSelf}
            title={isSelf ? "You can't deactivate yourself" : 'Toggle account active state'}
            className={[
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border transition-colors',
              active
                ? 'bg-mvr-success-light border-mvr-success/30 text-mvr-success'
                : 'bg-mvr-neutral border-[#E0DBD4] text-muted-foreground',
              isSelf ? 'opacity-60 cursor-not-allowed' : 'hover:brightness-105',
            ].join(' ')}
          >
            <Power className="w-3 h-3" aria-hidden />
            {active ? 'Active' : 'Inactive'}
          </button>
        </div>
      </div>

      {/* Permission groups */}
      <div className="space-y-4">
        {grouped.map(([group, resources]) => {
          const allSame = resources.every((r) => selection[r.key] === selection[resources[0].key])
          const groupLevel: Level | 'none' | 'mixed' = allSame
            ? (selection[resources[0].key] as Level | 'none')
            : 'mixed'
          return (
            <div
              key={group}
              className="bg-white rounded-xl border border-[#E0DBD4] shadow-card overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-[#E0DBD4] bg-mvr-cream/40 flex items-center justify-between gap-3">
                <h3 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary">
                  {group}
                </h3>
                <div className="inline-flex rounded-md border border-[#E0DBD4] bg-white overflow-hidden text-[10px] uppercase tracking-wider">
                  {(['none', 'view', 'edit'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setGroup(group, level)}
                      className={`px-2.5 py-1 transition-colors ${
                        groupLevel === level
                          ? 'bg-mvr-primary text-white font-semibold'
                          : 'text-mvr-primary hover:bg-mvr-cream'
                      }`}
                    >
                      Set all {level}
                    </button>
                  ))}
                </div>
              </div>
              <div className="divide-y divide-[#E0DBD4]">
                {resources.map((r) => {
                  const current = selection[r.key]
                  return (
                    <div
                      key={r.key}
                      className="px-5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-mvr-primary font-medium">{r.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">{r.key}</div>
                      </div>
                      <div className="inline-flex rounded-md border border-[#E0DBD4] bg-white overflow-hidden text-xs">
                        {(['none', 'view', 'edit'] as const).map((level) => {
                          const isActiveLvl = current === level
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setOne(r.key, level)}
                              className={[
                                'px-3 py-1 capitalize transition-colors',
                                isActiveLvl
                                  ? level === 'edit'
                                    ? 'bg-mvr-primary text-white font-semibold'
                                    : level === 'view'
                                      ? 'bg-mvr-sand-light text-mvr-primary font-semibold'
                                      : 'bg-mvr-neutral text-muted-foreground font-semibold'
                                  : 'text-mvr-primary hover:bg-mvr-cream',
                              ].join(' ')}
                            >
                              {level}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save bar */}
      <div className="sticky bottom-0 bg-white border-t border-[#E0DBD4] shadow-panel rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          {error ? (
            <p className="text-xs text-mvr-danger">{error}</p>
          ) : savedAt ? (
            <p className="text-xs text-mvr-success">Saved.</p>
          ) : dirty ? (
            <p className="text-xs text-muted-foreground">Unsaved changes.</p>
          ) : (
            <p className="text-xs text-muted-foreground">No changes.</p>
          )}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!dirty || saving || (isSelf && !isSuperAdmin)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>
    </div>
  )
}
