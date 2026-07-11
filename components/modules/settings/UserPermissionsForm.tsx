'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Power } from 'lucide-react'
import {
  PermissionMatrix,
  selectionFromPermissions,
  selectionToPermissions,
  type PermissionSelection,
} from './PermissionMatrix'

interface Props {
  userId: string
  email: string
  name: string | null
  isActive: boolean
  isSelf: boolean
  isSuperAdmin: boolean
  // Whether the CURRENT viewer is a super admin (controls who can grant Full),
  // distinct from `isSuperAdmin` which is about the user being edited.
  viewerIsSuperAdmin: boolean
  initialRoleId: string | null
  roles: Array<{ id: string; name: string; permissions: Array<{ resource: string; level: string }> }>
  initialPermissions: Array<{ resource: string; level: string }>
}

export function UserPermissionsForm({
  userId,
  email,
  name,
  isActive,
  isSelf,
  isSuperAdmin,
  viewerIsSuperAdmin,
  initialRoleId,
  roles,
  initialPermissions,
}: Props) {
  const router = useRouter()
  const initial = useMemo<PermissionSelection>(
    () => selectionFromPermissions(initialPermissions),
    [initialPermissions]
  )
  const [selection, setSelection] = useState<PermissionSelection>(initial)
  const [active, setActive] = useState(isActive)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [roleId, setRoleId] = useState<string | null>(initialRoleId)

  const assignedRole = roles.find((r) => r.id === roleId) ?? null
  // "Customized" when the user's current selection diverges from the assigned
  // role's preset (roles are copy-on-apply, so drift is expected and allowed).
  const customized = useMemo(() => {
    if (!assignedRole) return false
    const preset = selectionFromPermissions(assignedRole.permissions)
    return Object.keys(selection).some(
      (k) => selection[k as keyof PermissionSelection] !== preset[k as keyof PermissionSelection]
    )
  }, [assignedRole, selection])

  function applyRole(id: string) {
    if (id === '') {
      setRoleId(null)
      return
    }
    const r = roles.find((x) => x.id === id)
    setRoleId(id)
    if (r) setSelection(selectionFromPermissions(r.permissions))
  }

  const totalCount = Object.values(selection).filter((v) => v !== 'none').length
  const editCount = Object.values(selection).filter((v) => v === 'edit').length
  const fullCount = Object.values(selection).filter((v) => v === 'full').length

  const dirty = useMemo(() => {
    for (const key of Object.keys(selection)) {
      if (
        initial[key as keyof PermissionSelection] !==
        selection[key as keyof PermissionSelection]
      ) {
        return true
      }
    }
    if (active !== isActive) return true
    return roleId !== initialRoleId
  }, [selection, active, initial, isActive, roleId, initialRoleId])

  async function onSave() {
    if (isSelf && !isSuperAdmin) {
      setError("You can't edit your own permissions.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const permissions = selectionToPermissions(selection)
      const permRes = await fetch(`/api/v1/users/${userId}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions, roleId }),
      })
      if (!permRes.ok) {
        const body = await permRes.json().catch(() => ({}))
        throw new Error(body.error ?? `Permissions save failed (${permRes.status})`)
      }
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

  const disabled = isSelf && !isSuperAdmin

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-mvr-primary">{name ?? email}</h1>
          {name && <p className="text-sm text-muted-foreground font-mono">{email}</p>}
          <p className="text-xs text-muted-foreground mt-1">
            {totalCount} resource{totalCount === 1 ? '' : 's'} granted · {editCount} with edit access
            {fullCount > 0 && <> · <span className="text-mvr-danger font-medium">{fullCount} with full</span></>}
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

      <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[220px]">
          <label htmlFor="user-role" className="mb-1.5 block text-sm font-medium text-mvr-olive">
            Role preset
          </label>
          <select
            id="user-role"
            value={roleId ?? ''}
            onChange={(e) => applyRole(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20 disabled:opacity-50"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        {roleId && customized && (
          <span className="self-end inline-flex items-center rounded-full border border-mvr-warning/30 bg-mvr-warning-light px-2.5 py-1 text-xs font-medium text-mvr-warning">
            Customized
          </span>
        )}
        <p className="w-full text-xs text-muted-foreground">
          Selecting a role fills the matrix below with its preset. You can then adjust individual resources &mdash;
          that just marks the user &ldquo;Customized&rdquo;.
        </p>
      </div>

      <PermissionMatrix
        value={selection}
        onChange={setSelection}
        disabled={disabled}
        canGrantFull={viewerIsSuperAdmin}
      />

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
          disabled={!dirty || saving || disabled}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>
    </div>
  )
}
