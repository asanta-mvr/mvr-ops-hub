'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { CheckCircle2, AlertCircle, CircleDashed, Loader2, KeyRound, ChevronDown } from 'lucide-react'

export interface SafeGuestyConnection {
  id: string
  name: string
  clientId: string
  status: string
  lastError: string | null
  lastSyncAt: string | null
  lastSyncCount: number | null
  hasSecret: boolean
  envManaged?: boolean
}

export interface GuestySyncLogEntry {
  id: string
  operation: string
  status: string
  message: string | null
  itemCount: number | null
  createdAt: string
}

const OP_LABEL: Record<string, string> = {
  listing_sync: 'Listing refresh',
  owner_sync: 'Owner refresh',
  test_connection: 'Test connection',
}

function fmtLogTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Recent-activity log: shows each sync/test attempt with its outcome + reason. */
function SyncActivityLog({ logs }: { logs: GuestySyncLogEntry[] }) {
  const [open, setOpen] = useState(true)
  if (logs.length === 0) return null
  const failures = logs.filter((l) => l.status === 'error').length

  return (
    <div className="border-t border-[#E0DBD4] px-6 py-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-mvr-olive">
          Sync activity
          {failures > 0 && (
            <span className="rounded-full bg-mvr-danger-light px-2 py-0.5 text-xs font-medium text-mvr-danger">
              {failures} failed
            </span>
          )}
        </span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <ul className="mt-3 space-y-2">
          {logs.map((l) => {
            const error = l.status === 'error'
            const Icon = error ? AlertCircle : CheckCircle2
            return (
              <li key={l.id} className="flex items-start gap-2.5 text-xs">
                <Icon className={`mt-0.5 size-3.5 shrink-0 ${error ? 'text-mvr-danger' : 'text-mvr-success'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-mvr-olive">{OP_LABEL[l.operation] ?? l.operation}</span>
                    <span className="shrink-0 text-muted-foreground">{fmtLogTime(l.createdAt)}</span>
                  </div>
                  {l.message && (
                    <p className={`mt-0.5 break-words ${error ? 'text-mvr-danger' : 'text-muted-foreground'}`}>
                      {l.message}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(120),
  // Optional here because env-managed setups hide this field; the server
  // enforces it for the non-env case and returns a field error if missing.
  clientId: z.string().max(200).optional(),
  clientSecret: z.string().max(500).optional(),
})
type FormValues = z.infer<typeof formSchema>

const inputClass =
  'w-full rounded-lg border border-[#E0DBD4] bg-white px-3.5 py-2.5 text-sm text-mvr-olive ' +
  'placeholder:text-muted-foreground/50 outline-none transition-colors ' +
  'focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20 ' +
  'disabled:cursor-not-allowed disabled:bg-mvr-neutral/40'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
    connected: { label: 'Connected', cls: 'bg-mvr-success-light text-mvr-success', Icon: CheckCircle2 },
    error: { label: 'Error', cls: 'bg-mvr-danger-light text-mvr-danger', Icon: AlertCircle },
    disconnected: { label: 'Not connected', cls: 'bg-mvr-neutral text-muted-foreground', Icon: CircleDashed },
  }
  const { label, cls, Icon } = map[status] ?? map.disconnected
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      <Icon className="size-3.5" />
      {label}
    </span>
  )
}

export default function GuestyConnectionForm({
  connection,
  editable,
  envManaged = false,
  logs = [],
}: {
  connection: SafeGuestyConnection | null
  editable: boolean
  envManaged?: boolean
  logs?: GuestySyncLogEntry[]
}) {
  const router = useRouter()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name: connection?.name ?? 'Guesty Distribution Account',
      clientId: connection?.clientId ?? '',
      clientSecret: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    const payload: Record<string, string> = { name: values.name }
    // When credentials come from env vars, the server ignores client id/secret.
    if (!envManaged) {
      payload.clientId = values.clientId ?? ''
      // Only send the secret when the user actually typed one (write-only field).
      if (values.clientSecret && values.clientSecret.length > 0) {
        payload.clientSecret = values.clientSecret
      }
    }

    try {
      const res = await fetch('/api/v1/integrations/guesty/connection', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (!res.ok) {
        const msg = json?.error ?? 'Failed to save connection'
        setServerError(msg)
        toast.error(msg)
        return
      }

      if (json.data?.status === 'connected') {
        toast.success('Connected to Guesty')
      } else {
        const msg = json.data?.lastError ?? 'Saved, but could not connect — check your credentials.'
        setServerError(msg)
        toast.error('Could not connect to Guesty')
      }
      router.refresh()
    } catch {
      const msg = 'Network error — please try again'
      setServerError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-[#E0DBD4] px-6 py-4">
        <h2 className="font-display text-xl text-mvr-primary">Guesty Distribution Account</h2>
        <StatusBadge status={connection?.status ?? 'disconnected'} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-6">
        <div>
          <label htmlFor="g-name" className="mb-1.5 block text-sm font-medium text-mvr-olive">
            Name
          </label>
          <input
            id="g-name"
            {...register('name')}
            disabled={!editable || isSubmitting}
            placeholder="e.g. My Guesty Account"
            className={inputClass}
          />
          {errors.name && <p className="mt-1 text-xs text-mvr-danger">{errors.name.message}</p>}
        </div>

        {envManaged ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#E0DBD4] bg-mvr-sand-light px-4 py-3">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-mvr-primary" />
            <div className="text-sm">
              <p className="font-medium text-mvr-olive">Credentials managed by environment</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Using <code className="rounded bg-white px-1 py-0.5">GUESTY_CLIENT_ID</code> and{' '}
                <code className="rounded bg-white px-1 py-0.5">GUESTY_CLIENT_SECRET</code> from the server
                environment.
                {connection?.clientId ? (
                  <>
                    {' '}
                    Client ID <span className="font-mono text-mvr-olive">{connection.clientId}</span>.
                  </>
                ) : null}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="g-client-id" className="mb-1.5 block text-sm font-medium text-mvr-olive">
                Client ID
              </label>
              <input
                id="g-client-id"
                {...register('clientId')}
                disabled={!editable || isSubmitting}
                placeholder="Guesty Client ID"
                autoComplete="off"
                className={inputClass}
              />
              {errors.clientId && <p className="mt-1 text-xs text-mvr-danger">{errors.clientId.message}</p>}
            </div>

            <div>
              <label htmlFor="g-client-secret" className="mb-1.5 block text-sm font-medium text-mvr-olive">
                Client Secret
              </label>
              <input
                id="g-client-secret"
                type="password"
                {...register('clientSecret')}
                disabled={!editable || isSubmitting}
                placeholder={connection?.hasSecret ? '•••••••••• (leave blank to keep)' : 'Guesty Client Secret'}
                autoComplete="new-password"
                className={inputClass}
              />
              {errors.clientSecret && (
                <p className="mt-1 text-xs text-mvr-danger">{errors.clientSecret.message}</p>
              )}
            </div>
          </>
        )}

        {serverError && (
          <div className="rounded-lg bg-mvr-danger-light px-3.5 py-2.5 text-sm text-mvr-danger">{serverError}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {envManaged
              ? 'Test the connection to verify your environment credentials.'
              : 'Credentials are encrypted at rest.'}
          </p>
          <button
            type="submit"
            disabled={!editable || isSubmitting}
            className="inline-flex items-center gap-2 rounded-full bg-mvr-primary px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-mvr-primary/90 focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {isSubmitting
              ? 'Connecting…'
              : connection?.status === 'connected'
                ? envManaged
                  ? 'Test connection'
                  : 'Save & Reconnect'
                : 'Connect Guesty'}
          </button>
        </div>
      </form>

      <SyncActivityLog logs={logs} />
    </div>
  )
}
