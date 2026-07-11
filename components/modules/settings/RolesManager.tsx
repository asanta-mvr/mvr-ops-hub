'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { RoleEditorModal } from './RoleEditorModal'

export interface RolePermission {
  resource: string
  level: string
}

export interface RoleRow {
  id: string
  name: string
  description: string | null
  rank: number
  permissions: RolePermission[]
  userCount: number
}

interface Props {
  roles: RoleRow[]
  canEdit: boolean
  viewerIsSuperAdmin: boolean
}

function summarize(perms: RolePermission[]): string {
  const counts = { view: 0, edit: 0, full: 0 } as Record<string, number>
  for (const p of perms) if (p.level in counts) counts[p.level]++
  const parts: string[] = []
  if (counts.view) parts.push(`${counts.view} view`)
  if (counts.edit) parts.push(`${counts.edit} edit`)
  if (counts.full) parts.push(`${counts.full} full`)
  return parts.length ? parts.join(' · ') : 'No access granted'
}

export function RolesManager({ roles, canEdit, viewerIsSuperAdmin }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleDelete(role: RoleRow) {
    setBusyId(role.id)
    try {
      const res = await fetch(`/api/v1/roles/${role.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(j?.error ?? 'Delete failed')
      }
      toast.success(`Role "${role.name}" deleted`)
      setConfirmDeleteId(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete role')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground max-w-2xl">
          Roles are permission presets. Applying a role to a user copies its access as a starting point you can
          then customize per user.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            New role
          </button>
        )}
      </div>

      {roles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#E0DBD4] bg-white px-6 py-10 text-center text-sm text-muted-foreground">
          No roles yet. {canEdit ? 'Create one to preset access for your team.' : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {roles.map((r) => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-[#E0DBD4] shadow-card px-5 py-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldCheck className="w-4 h-4 text-mvr-primary shrink-0" />
                  <h3 className="font-medium text-mvr-primary">{r.name}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {r.userCount} user{r.userCount === 1 ? '' : 's'}
                  </span>
                </div>
                {r.description && <p className="text-sm text-muted-foreground mt-0.5">{r.description}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{summarize(r.permissions)}</p>
              </div>

              {canEdit && (
                <div className="flex items-center gap-1 shrink-0">
                  {confirmDeleteId === r.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-mvr-danger font-medium">Delete?</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        disabled={busyId === r.id}
                        className="px-2 py-0.5 text-xs rounded bg-mvr-danger text-white hover:bg-mvr-danger/90 transition-colors disabled:opacity-50"
                      >
                        {busyId === r.id ? '…' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-0.5 text-xs rounded bg-mvr-neutral text-foreground hover:bg-mvr-steel-light transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-mvr-primary hover:bg-mvr-primary-light transition-colors font-medium"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(r.id)}
                        className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-mvr-danger hover:bg-mvr-danger-light transition-colors font-medium"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <RoleEditorModal
          role={editing}
          canGrantFull={viewerIsSuperAdmin}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          onSaved={() => {
            setCreating(false)
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
