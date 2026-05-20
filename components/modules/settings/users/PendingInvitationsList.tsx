'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, RotateCcw, X, Loader2, MailWarning } from 'lucide-react'

export type PendingInvitationRow = {
  id: string
  email: string
  name: string | null
  invitedByName: string
  invitedByEmail: string | null
  permissionCount: number
  expiresAt: string
  createdAt: string
}

interface Props {
  rows: PendingInvitationRow[]
}

function timeFromNow(iso: string): string {
  const target = new Date(iso).getTime()
  const diffMs = target - Date.now()
  const absDays = Math.abs(diffMs) / (1000 * 60 * 60 * 24)
  if (absDays < 1) {
    const hours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60))
    return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`
  }
  const days = Math.round(absDays)
  return diffMs >= 0 ? `in ${days}d` : `${days}d ago`
}

export function PendingInvitationsList({ rows }: Props) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function onResend(id: string) {
    setBusyId(id)
    setFlash(null)
    try {
      const res = await fetch(`/api/v1/invitations/${id}/resend`, { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        data?: { emailSent: boolean; emailError: string | null }
      }
      if (!res.ok) throw new Error(body.error ?? `Resend failed (${res.status})`)
      if (body.data?.emailSent) {
        setFlash({ type: 'success', text: 'Invitation re-sent.' })
      } else {
        setFlash({
          type: 'error',
          text: body.data?.emailError ?? 'Token rotated, but email was not sent.',
        })
      }
      router.refresh()
    } catch (err) {
      setFlash({ type: 'error', text: err instanceof Error ? err.message : 'Resend failed' })
    } finally {
      setBusyId(null)
    }
  }

  async function onCancel(id: string, email: string) {
    if (!confirm(`Cancel invitation to ${email}?`)) return
    setBusyId(id)
    setFlash(null)
    try {
      const res = await fetch(`/api/v1/invitations/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Cancel failed (${res.status})`)
      }
      setFlash({ type: 'success', text: 'Invitation cancelled.' })
      router.refresh()
    } catch (err) {
      setFlash({ type: 'error', text: err instanceof Error ? err.message : 'Cancel failed' })
    } finally {
      setBusyId(null)
    }
  }

  if (rows.length === 0) {
    return null
  }

  return (
    <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card overflow-hidden">
      <div className="px-5 py-3 border-b border-[#E0DBD4] bg-mvr-cream/40 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Pending invitations
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} waiting to accept their invitation
          </p>
        </div>
      </div>

      {flash && (
        <div
          className={`px-5 py-2 text-xs border-b border-[#E0DBD4] flex items-center gap-2 ${
            flash.type === 'success'
              ? 'bg-mvr-success-light text-mvr-success'
              : 'bg-mvr-warning-light text-mvr-warning'
          }`}
        >
          {flash.type === 'error' && <MailWarning className="w-3.5 h-3.5" />}
          {flash.text}
        </div>
      )}

      <div className="divide-y divide-[#E0DBD4]">
        {rows.map((row) => {
          const busy = busyId === row.id
          return (
            <div
              key={row.id}
              className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm text-mvr-primary font-medium truncate">{row.email}</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                  {row.name && <span>{row.name}</span>}
                  {row.name && <span aria-hidden>·</span>}
                  <span>
                    Invited by <span className="text-mvr-primary">{row.invitedByName}</span>
                  </span>
                  <span aria-hidden>·</span>
                  <span>
                    {row.permissionCount} permission{row.permissionCount === 1 ? '' : 's'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>Expires {timeFromNow(row.expiresAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onResend(row.id)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-[#E0DBD4] text-mvr-primary bg-white hover:bg-mvr-cream transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {busy ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Resend
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onCancel(row.id, row.email)}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-mvr-danger/30 text-mvr-danger bg-white hover:bg-mvr-danger-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
