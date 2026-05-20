'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Mail, Send, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import {
  PermissionMatrix,
  emptySelection,
  selectionToPermissions,
  type PermissionSelection,
} from '@/components/modules/settings/PermissionMatrix'

const COMPANY_DOMAIN = 'miamivacationrentals.com'

type ApiSuccess = {
  data: {
    id: string
    email: string
    expiresAt: string
    emailSent: boolean
    emailError: string | null
  }
}

export function InviteUserForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [selection, setSelection] = useState<PermissionSelection>(() => emptySelection())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    email: string
    emailSent: boolean
    emailError: string | null
  } | null>(null)

  const totalGranted = useMemo(
    () => Object.values(selection).filter((v) => v !== 'none').length,
    [selection]
  )

  const emailLooksValid = useMemo(() => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return false
    const at = trimmed.indexOf('@')
    if (at < 1) return false
    return trimmed.endsWith(`@${COMPANY_DOMAIN}`)
  }, [email])

  const canSubmit = emailLooksValid && !submitting

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const permissions = selectionToPermissions(selection)
      const res = await fetch('/api/v1/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: name.trim() || undefined,
          message: message.trim() || undefined,
          permissions,
        }),
      })

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? `Request failed (${res.status})`)
      }

      const body = (await res.json()) as ApiSuccess
      setSuccess({
        email: body.data.email,
        emailSent: body.data.emailSent,
        emailError: body.data.emailError,
      })
      setEmail('')
      setName('')
      setMessage('')
      setSelection(emptySelection())
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <Link
        href="/settings/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-mvr-primary"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to users
      </Link>

      <div>
        <h1 className="font-display text-2xl text-mvr-primary">Invite a teammate</h1>
        <p className="text-sm text-muted-foreground mt-1">
          They&apos;ll receive an email with a link to sign in with their{' '}
          <span className="font-mono">@{COMPANY_DOMAIN}</span> Google account.
        </p>
      </div>

      {success && (
        <div className="bg-mvr-success-light border border-mvr-success/30 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-mvr-success flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-mvr-success">
              Invitation created for {success.email}
            </p>
            {success.emailSent ? (
              <p className="text-mvr-olive mt-0.5">The email is on its way.</p>
            ) : (
              <p className="text-mvr-warning mt-0.5">
                {success.emailError ??
                  'Email was not sent (SMTP not configured). Share the invitation link manually.'}
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-mvr-danger-light border border-mvr-danger/30 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-mvr-danger flex-shrink-0 mt-0.5" />
          <p className="text-sm text-mvr-danger">{error}</p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-5 space-y-4">
          <h2 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary">
            Identity
          </h2>

          <div>
            <label htmlFor="email" className="block text-xs font-medium text-muted-foreground mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`teammate@${COMPANY_DOMAIN}`}
                required
                className="w-full pl-9 pr-3 py-2 border border-[#E0DBD4] rounded-lg text-sm bg-mvr-cream/40 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary transition-colors"
              />
            </div>
            {email && !emailLooksValid && (
              <p className="text-xs text-mvr-danger mt-1">
                Email must end in <span className="font-mono">@{COMPANY_DOMAIN}</span>.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="name" className="block text-xs font-medium text-muted-foreground mb-1">
              Full name <span className="text-muted-foreground/60">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Juan Pérez"
              maxLength={120}
              className="w-full px-3 py-2 border border-[#E0DBD4] rounded-lg text-sm bg-mvr-cream/40 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="message"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Personal message{' '}
              <span className="text-muted-foreground/60">(optional, shown in the email)</span>
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Welcome to the team! Let me know if you have any questions."
              className="w-full px-3 py-2 border border-[#E0DBD4] rounded-lg text-sm bg-mvr-cream/40 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary transition-colors resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1">{message.length}/500</p>
          </div>

          <div className="text-xs text-muted-foreground bg-mvr-sand-light/60 border border-[#E0DBD4] rounded-lg px-3 py-2">
            The user&apos;s role defaults to{' '}
            <code className="font-mono text-mvr-primary">read_only</code> on first sign-in. Adjust
            it from the user detail page after they activate their account.
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 px-1">
            <div>
              <h2 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary">
                Permissions
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Pick the sections this user can <span className="font-medium">view</span> or{' '}
                <span className="font-medium">edit</span>.
              </p>
            </div>
            <span className="text-xs text-mvr-primary font-medium">{totalGranted} granted</span>
          </div>
          <PermissionMatrix value={selection} onChange={setSelection} />
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E0DBD4] shadow-panel rounded-xl px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">The invitation expires in 7 days.</p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-mvr-primary text-white hover:bg-mvr-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            Send invitation
          </button>
        </div>
      </form>
    </div>
  )
}
