'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Hash, Lock, RefreshCw, Search, Send, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

export interface SlackChannelRow {
  id: string
  slackChannelId: string
  name: string
  isPrivate: boolean
  isArchived: boolean
  isMember: boolean
  numMembers: number | null
  syncedAt: string
}

const inputClass =
  'w-full rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive ' +
  'placeholder:text-muted-foreground/50 outline-none transition-colors ' +
  'focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20'

export default function SlackChannelsTable({
  initialRows,
  initialTotal,
  connected,
  editable,
  pageSize,
}: {
  initialRows: SlackChannelRow[]
  initialTotal: number
  connected: boolean
  editable: boolean
  pageSize: number
}) {
  const [rows, setRows] = useState<SlackChannelRow[]>(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const load = useCallback(
    async (nextPage: number, nextSearch: string) => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) })
        if (nextSearch) params.set('search', nextSearch)
        const res = await fetch(`/api/v1/integrations/slack/channels?${params.toString()}`)
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error ?? 'Failed to load channels')
        setRows(json.data.rows)
        setTotal(json.data.total)
        setPage(json.data.page)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Failed to load channels')
      } finally {
        setLoading(false)
      }
    },
    [pageSize],
  )

  // Debounced search.
  useEffect(() => {
    const t = setTimeout(() => {
      void load(1, search)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const onRefresh = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/v1/integrations/slack/channels/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to refresh channels')
      toast.success(`Synced ${json.data.synced} channel${json.data.synced === 1 ? '' : 's'}`)
      await load(1, search)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to refresh channels')
    } finally {
      setSyncing(false)
    }
  }

  const onSendTest = async (channel: SlackChannelRow) => {
    setTestingId(channel.id)
    try {
      const res = await fetch('/api/v1/integrations/slack/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelId: channel.slackChannelId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? 'Failed to send test message')
      toast.success(`Test message sent to #${channel.name}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send test message')
    } finally {
      setTestingId(null)
    }
  }

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0DBD4] px-6 py-4">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels…"
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={!editable || !connected || syncing}
          className="inline-flex items-center gap-2 rounded-full border border-mvr-primary/20 bg-mvr-primary-light px-4 py-2 text-sm font-medium text-mvr-primary transition-all hover:bg-mvr-steel-light focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          title={!connected ? 'Connect Slack first' : 'Pull the latest channels from Slack'}
        >
          {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {syncing ? 'Refreshing…' : 'Refresh channels'}
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <Hash className="mx-auto size-8 text-mvr-steel" />
          <p className="mt-3 text-sm font-medium text-mvr-olive">
            {connected ? 'No channels yet' : 'Connect Slack to list channels'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {connected
              ? 'Click “Refresh channels” to pull every public channel from your workspace.'
              : 'Save a bot token above, then refresh to see your channels here.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-3 font-medium">Channel</th>
                <th className="px-6 py-3 font-medium">Members</th>
                <th className="px-6 py-3 font-medium">Bot access</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-[#E0DBD4]/60 transition-colors hover:bg-mvr-neutral/40">
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2 font-medium text-mvr-olive">
                      {c.isPrivate ? (
                        <Lock className="size-3.5 text-mvr-steel" />
                      ) : (
                        <Hash className="size-3.5 text-mvr-steel" />
                      )}
                      {c.name}
                      {c.isArchived && (
                        <span className="rounded-full bg-mvr-neutral px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          archived
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{c.slackChannelId}</span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground">{c.numMembers ?? '—'}</td>
                  <td className="px-6 py-3">
                    {c.isMember ? (
                      <span className="rounded-full bg-mvr-success-light px-2.5 py-0.5 text-xs font-medium text-mvr-success">
                        Member
                      </span>
                    ) : (
                      <span className="rounded-full bg-mvr-sand-light px-2.5 py-0.5 text-xs font-medium text-mvr-warning">
                        Not a member
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onSendTest(c)}
                      disabled={!editable || !connected || testingId === c.id}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-mvr-primary transition-colors hover:bg-mvr-primary-light focus-visible:ring-2 focus-visible:ring-mvr-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Send a test message to this channel"
                    >
                      {testingId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                      Test
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 text-xs text-muted-foreground">
          <span>
            {total} channel{total === 1 ? '' : 's'}
            {loading && <Loader2 className="ml-2 inline size-3 animate-spin" />}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => load(page - 1, search)}
              disabled={page <= 1 || loading}
              className="inline-flex items-center rounded-md p-1.5 text-mvr-olive transition-colors hover:bg-mvr-neutral disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => load(page + 1, search)}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center rounded-md p-1.5 text-mvr-olive transition-colors hover:bg-mvr-neutral disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
