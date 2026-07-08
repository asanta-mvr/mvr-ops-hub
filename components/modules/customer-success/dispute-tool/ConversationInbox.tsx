'use client'

import { Fragment } from 'react'
import { Loader2, MessagesSquare, Workflow } from 'lucide-react'
import {
  conversationChannelLabel,
  type ConversationMessage,
} from '@/lib/disputes/types'

// MVR operates in Miami — render conversation timestamps in that local zone.
const TZ = 'America/New_York'

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name: string | null, fallback: string): string {
  const src = (name || fallback).trim()
  const parts = src.split(/\s+/).filter(Boolean)
  if (!parts.length) return fallback.slice(0, 2).toUpperCase()
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

function ChannelBadge({ channel }: { channel: string | null }) {
  const label = conversationChannelLabel(channel)
  if (!label) return null
  return (
    <span className="rounded-full bg-mvr-neutral px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
  )
}

function Avatar({ kind, label }: { kind: 'guest' | 'host' | 'auto'; label: string }) {
  const cls =
    kind === 'guest'
      ? 'bg-mvr-steel text-white'
      : kind === 'auto'
        ? 'bg-mvr-sand text-mvr-olive'
        : 'bg-mvr-primary text-white'
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${cls}`}>
      {kind === 'auto' ? <Workflow className="h-3.5 w-3.5" /> : label}
    </div>
  )
}

function MessageRow({ m, guestName }: { m: ConversationMessage; guestName: string | null }) {
  const isGuest = m.sentBy === 'guest'
  const senderName = isGuest
    ? guestName || 'Guest'
    : m.isAutomatic
      ? 'Guesty Workflow'
      : m.userName || 'Host'
  const avatarKind = isGuest ? 'guest' : m.isAutomatic ? 'auto' : 'host'

  return (
    <div className={`flex items-end gap-2 ${isGuest ? 'justify-start' : 'flex-row-reverse justify-start'}`}>
      <Avatar kind={avatarKind} label={initials(isGuest ? guestName : m.userName, isGuest ? 'G' : 'H')} />
      <div className={`flex min-w-0 max-w-[78%] flex-col ${isGuest ? 'items-start' : 'items-end'}`}>
        <div className={`mb-0.5 flex items-center gap-1.5 ${isGuest ? '' : 'flex-row-reverse'}`}>
          <span className="text-[11px] font-medium text-mvr-primary">{senderName}</span>
          <ChannelBadge channel={m.channel} />
          <span className="text-[10px] text-muted-foreground">{fmtTime(m.createdAt)}</span>
        </div>
        <div
          className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded-2xl px-3 py-2 text-sm shadow-card ${
            isGuest
              ? 'rounded-bl-sm bg-white text-mvr-olive'
              : 'rounded-br-sm bg-mvr-primary-light text-mvr-primary'
          }`}
        >
          {m.body}
        </div>
      </div>
    </div>
  )
}

function LogRow({ m }: { m: ConversationMessage }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1">
      <span className="rounded-full bg-mvr-neutral px-2.5 py-0.5 text-[10px] text-muted-foreground">
        {m.body}
        {m.userName ? ` · ${m.userName}` : ''} · {fmtTime(m.createdAt)}
      </span>
    </div>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-1">
      <span className="rounded-full border border-[#E0DBD4] bg-mvr-cream px-3 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  )
}

interface Props {
  messages: ConversationMessage[]
  isLoading: boolean
  isError: boolean
  guestName: string | null
  emptyHint?: string
  // Extra classes for the message-list container (e.g. responsive height + scroll
  // when embedded in a fixed-size panel). Defaults to none.
  className?: string
}

export function ConversationInbox({ messages, isLoading, isError, guestName, emptyHint, className }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation…
      </div>
    )
  }
  if (isError) {
    return <p className="p-6 text-center text-sm text-mvr-danger">Couldn&apos;t load the conversation.</p>
  }
  if (!messages.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <MessagesSquare className="h-7 w-7 text-mvr-steel" />
        {emptyHint ?? 'No guest conversation is linked to this case.'}
      </div>
    )
  }

  let lastDay = ''
  return (
    <div className={`space-y-3 rounded-xl border border-[#E0DBD4] bg-mvr-cream/50 p-4 ${className ?? ''}`}>
      {messages.map((m) => {
        const day = dayKey(m.createdAt)
        const showDay = day && day !== lastDay
        lastDay = day || lastDay
        return (
          <Fragment key={m.id}>
            {showDay ? <DayDivider label={day} /> : null}
            {m.sentBy === 'log' ? <LogRow m={m} /> : <MessageRow m={m} guestName={guestName} />}
          </Fragment>
        )
      })}
    </div>
  )
}
