'use client'

import { useMemo } from 'react'
import { RESOURCES, type Level, type Resource } from '@/lib/auth/resources'

export type PermissionSelection = Record<Resource, Level | 'none'>

export function emptySelection(): PermissionSelection {
  const base: Record<string, Level | 'none'> = {}
  for (const r of RESOURCES) base[r.key] = 'none'
  return base as PermissionSelection
}

export function selectionFromPermissions(
  perms: Array<{ resource: string; level: string }>
): PermissionSelection {
  const sel = emptySelection()
  for (const p of perms) {
    if ((p.level === 'view' || p.level === 'edit') && p.resource in sel) {
      sel[p.resource as Resource] = p.level
    }
  }
  return sel
}

export function selectionToPermissions(
  selection: PermissionSelection
): Array<{ resource: Resource; level: Level }> {
  return (Object.entries(selection) as Array<[Resource, Level | 'none']>)
    .filter(([, level]) => level !== 'none')
    .map(([resource, level]) => ({ resource, level: level as Level }))
}

interface Props {
  value: PermissionSelection
  onChange: (next: PermissionSelection) => void
  disabled?: boolean
}

export function PermissionMatrix({ value, onChange, disabled = false }: Props) {
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof RESOURCES[number][]>()
    for (const r of RESOURCES) {
      const list = groups.get(r.group) ?? []
      list.push(r)
      groups.set(r.group, list)
    }
    return Array.from(groups.entries())
  }, [])

  function setOne(resource: Resource, level: Level | 'none') {
    if (disabled) return
    onChange({ ...value, [resource]: level })
  }

  function setGroup(group: string, level: Level | 'none') {
    if (disabled) return
    const next = { ...value }
    for (const r of RESOURCES) {
      if (r.group === group) next[r.key] = level
    }
    onChange(next)
  }

  function setAll(level: Level | 'none') {
    if (disabled) return
    const next = { ...value }
    for (const r of RESOURCES) next[r.key] = level
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mr-1">
          Bulk:
        </span>
        {(['view', 'edit', 'none'] as const).map((lvl) => (
          <button
            key={lvl}
            type="button"
            disabled={disabled}
            onClick={() => setAll(lvl)}
            className="text-xs px-3 py-1 rounded-full border border-[#E0DBD4] text-mvr-primary bg-white hover:bg-mvr-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed capitalize"
          >
            {lvl === 'none' ? 'Clear all' : `Set all ${lvl}`}
          </button>
        ))}
      </div>

      {grouped.map(([group, resources]) => {
        const allSame = resources.every(
          (r) => value[r.key] === value[resources[0].key]
        )
        const groupLevel: Level | 'none' | 'mixed' = allSame
          ? (value[resources[0].key] as Level | 'none')
          : 'mixed'
        return (
          <div
            key={group}
            className="bg-white rounded-xl border border-[#E0DBD4] shadow-card overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-[#E0DBD4] bg-mvr-cream/40 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary">
                {group}
              </h3>
              <div className="inline-flex rounded-md border border-[#E0DBD4] bg-white overflow-hidden text-[10px] uppercase tracking-wider">
                {(['none', 'view', 'edit'] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    disabled={disabled}
                    onClick={() => setGroup(group, level)}
                    className={`px-2.5 py-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                const current = value[r.key]
                return (
                  <div
                    key={r.key}
                    className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
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
                            disabled={disabled}
                            onClick={() => setOne(r.key, level)}
                            className={[
                              'px-3 py-1 capitalize transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
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
  )
}
