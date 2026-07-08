'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { CheckCircle2, AlertCircle, CircleDashed, Loader2, KeyRound, ChevronDown } from 'lucide-react'

export interface SafeSlackConnection {
  id: string
  name: string
  teamId: string | null
  teamName: string | null
  status: string
  lastError: string | null
  lastSyncAt: string | null
  lastSyncCount: number | null
  hasToken: boolean
  envManaged?: boolean
}

export interface SlackSyncLogEntry {
  id: string
  operation: string
  status: string
  message: string | null
  itemCount: number | null
  createdAt: string
}

const OP_LABEL: Record<string, string> = {
  channel_sync: 'Channel refresh',
  test_connection: 'Test connection',
  test_message: 'Test message',
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
function SyncActivityLog({ logs }: { logs: SlackSyncLogEntry[] }) {
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
  botToken: z.string().max(200).optional(),
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

export default function SlackConnectionForm({
  connection,
  editable,
  envManaged = false,
  logs = [],
}: {
  connection: SafeSlackConnection | null
  editable: boolean
  envManaged?: boolean
  logs?: SlackSyncLogEntry[]
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
      name: connection?.name ?? 'MVR Workspace',
      botToken: '',
    },
  })

  const onSubmit = async (values: FormValues) => {
    setServerError(null)
    const payload: Record<string, string> = { name: values.name }
    // When the token comes from an env var, the server ignores what we send.
    if (!envManaged && values.botToken && values.botToken.length > 0) {
      payload.botToken = values.botToken
    }

    try {
      const res = await fetch('/api/v1/integrations/slack/connection', {
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
        toast.success(json.data?.teamName ? `Connected to ${json.data.teamName}` : 'Connected to Slack')
      } else {
        const msg = json.data?.lastError ?? 'Saved, but could not connect — check your bot token.'
        setServerError(msg)
        toast.error('Could not connect to Slack')
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
        <div>
          <h2 className="font-display text-xl text-mvr-primary">Slack Workspace</h2>
          {connection?.teamName && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Workspace <span className="font-medium text-mvr-olive">{connection.teamName}</span>
            </p>
          )}
        </div>
        <StatusBadge status={connection?.status ?? 'disconnected'} />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-6">
        <div>
          <label htmlFor="s-name" className="mb-1.5 block text-sm font-medium text-mvr-olive">
            Name
          </label>
          <input
            id="s-name"
            {...register('name')}
            disabled={!editable || isSubmitting}
            placeholder="e.g. MVR Workspace"
            className={inputClass}
          />
          {errors.name && <p className="mt-1 text-xs text-mvr-danger">{errors.name.message}</p>}
        </div>

        {envManaged ? (
          <div className="flex items-start gap-3 rounded-lg border border-[#E0DBD4] bg-mvr-sand-light px-4 py-3">
            <KeyRound className="mt-0.5 size-4 shrink-0 text-mvr-primary" />
            <div className="text-sm">
              <p className="font-medium text-mvr-olive">Bot token managed by environment</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Using <code className="rounded bg-white px-1 py-0.5">SLACK_BOT_TOKEN</code> from the server
                environment. Test the connection to verify it.
              </p>
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="s-bot-token" className="mb-1.5 block text-sm font-medium text-mvr-olive">
              Bot User OAuth Token
            </label>
            <input
              id="s-bot-token"
              type="password"
              {...register('botToken')}
              disabled={!editable || isSubmitting}
              placeholder={connection?.hasToken ? '•••••••••• (leave blank to keep)' : 'xoxb-…'}
              autoComplete="new-password"
              className={inputClass}
            />
            {errors.botToken && <p className="mt-1 text-xs text-mvr-danger">{errors.botToken.message}</p>}
            <p className="mt-1.5 text-xs text-muted-foreground">
              Found under <span className="font-medium">OAuth &amp; Permissions</span> in your Slack app. Starts
              with <code className="rounded bg-mvr-neutral px-1 py-0.5">xoxb-</code>.
            </p>
          </div>
        )}

        {serverError && (
          <div className="rounded-lg bg-mvr-danger-light px-3.5 py-2.5 text-sm text-mvr-danger">{serverError}</div>
        )}

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground">
            {envManaged ? 'Test the connection to verify your environment token.' : 'The bot token is encrypted at rest.'}
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
                : 'Connect Slack'}
          </button>
        </div>
      </form>

      <SyncActivityLog logs={logs} />
    </div>
  )
}
