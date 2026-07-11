'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  PermissionMatrix,
  emptySelection,
  selectionFromPermissions,
  selectionToPermissions,
  type PermissionSelection,
} from './PermissionMatrix'
import type { RoleRow } from './RolesManager'

interface Props {
  role: RoleRow | null // null = create
  canGrantFull: boolean
  onClose: () => void
  onSaved: () => void
}

const inputClass =
  'w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20 disabled:opacity-50'

export function RoleEditorModal({ role, canGrantFull, onClose, onSaved }: Props) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [rank, setRank] = useState<string>(role ? String(role.rank) : '0')
  const [selection, setSelection] = useState<PermissionSelection>(
    role ? selectionFromPermissions(role.permissions) : emptySelection()
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSave() {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const parsedRank = parseInt(rank, 10)
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        rank: Number.isFinite(parsedRank) ? parsedRank : 0,
        permissions: selectionToPermissions(selection),
      }
      const res = await fetch(role ? `/api/v1/roles/${role.id}` : '/api/v1/roles', {
        method: role ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(j?.error ?? 'Save failed')
      }
      toast.success(role ? 'Role updated' : 'Role created')
      onSaved()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      setError(msg)
      toast.error(msg)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E0DBD4] bg-mvr-cream shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E0DBD4] bg-white px-6 py-4">
          <h2 className="font-display text-lg font-bold text-mvr-primary">{role ? 'Edit role' : 'New role'}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-mvr-neutral/60 hover:text-mvr-primary disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label htmlFor="role-name" className="mb-1.5 block text-sm font-medium text-mvr-olive">
                Name
              </label>
              <input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                placeholder="e.g. Operations Manager"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="role-rank" className="mb-1.5 block text-sm font-medium text-mvr-olive">
                Tier (rank)
              </label>
              <input
                id="role-rank"
                type="number"
                min={0}
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                disabled={saving}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="role-desc" className="mb-1.5 block text-sm font-medium text-mvr-olive">
              Description <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="What this role is for"
              className={inputClass}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-mvr-olive">Permissions preset</p>
            <PermissionMatrix value={selection} onChange={setSelection} canGrantFull={canGrantFull} disabled={saving} />
          </div>

          {error && <p className="text-sm text-mvr-danger">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E0DBD4] bg-white px-6 py-4">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Saving…' : role ? 'Save role' : 'Create role'}
          </Button>
        </div>
      </div>
    </div>
  )
}
