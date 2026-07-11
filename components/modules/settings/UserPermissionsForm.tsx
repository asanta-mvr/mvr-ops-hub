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
  // Whether the CURRENT viewer is a super admin (controls who can grant Erase),
  // distinct from `isSuperAdmin` which is about the user being edited.
  viewerIsSuperAdmin: boolean
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

  const totalCount = Object.values(selection).filter((v) => v !== 'none').length
  const editCount = Object.values(selection).filter((v) => v === 'edit').length
  const eraseCount = Object.values(selection).filter((v) => v === 'delete').length

  const dirty = useMemo(() => {
    for (const key of Object.keys(selection)) {
      if (
        initial[key as keyof PermissionSelection] !==
        selection[key as keyof PermissionSelection]
      ) {
        return true
      }
    }
    return active !== isActive
  }, [selection, active, initial, isActive])

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
        body: JSON.stringify({ permissions }),
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
            {eraseCount > 0 && <> · <span className="text-mvr-danger font-medium">{eraseCount} with erase</span></>}
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

      <PermissionMatrix
        value={selection}
        onChange={setSelection}
        disabled={disabled}
        canGrantErase={viewerIsSuperAdmin}
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
