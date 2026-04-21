'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, User, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { OtaSource, TicketStatus } from '@prisma/client'

const OTA_LABELS: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking', vrbo: 'VRBO',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}
const OTA_COLORS: Record<OtaSource, string> = {
  airbnb: 'bg-rose-100 text-rose-700', booking: 'bg-blue-100 text-blue-700',
  vrbo: 'bg-teal-100 text-teal-700', expedia: 'bg-yellow-100 text-yellow-800',
  vacasa: 'bg-purple-100 text-purple-700', other: 'bg-gray-100 text-gray-600',
}
const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', pending_guest: 'Pending Guest',
  pending_ota: 'Pending OTA', resolved: 'Resolved', closed: 'Closed',
}
const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-red-100 text-red-700', in_progress: 'bg-blue-100 text-blue-700',
  pending_guest: 'bg-amber-100 text-amber-700', pending_ota: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-500',
}

type Comment = {
  id: string
  body: string
  isInternal: boolean
  source: string
  createdAt: Date
  author: { id: string; name: string | null; image: string | null } | null
}

type Ticket = {
  id: string
  source: OtaSource
  status: TicketStatus
  subject: string
  body: string
  fromEmail: string
  guestName: string | null
  confirmationCode: string | null
  createdAt: Date
  resolvedAt: Date | null
  assignedTo: { id: string; name: string | null; email: string; image: string | null } | null
  listing: { id: string; name: string } | null
  unit: { id: string; number: string; buildingId: string } | null
  building: { id: string; name: string } | null
  comments: Comment[]
}

type Agent = { id: string; name: string | null }

interface TicketDetailProps {
  ticket: Ticket
  agents: Agent[]
}

export function TicketDetail({ ticket, agents }: TicketDetailProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [commentBody,  setCommentBody]  = useState('')
  const [isInternal,   setIsInternal]   = useState(false)
  const [submitting,   setSubmitting]   = useState(false)
  const [showDelete,   setShowDelete]   = useState(false)
  const [deleting,     setDeleting]     = useState(false)

  async function handleStatusChange(status: TicketStatus) {
    await fetch(`/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    startTransition(() => router.refresh())
  }

  async function handleAssigneeChange(assignedToId: string) {
    await fetch(`/api/v1/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignedToId: assignedToId || null }),
    })
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/v1/tickets/${ticket.id}`, { method: 'DELETE' })
    setDeleting(false)
    setShowDelete(false)
    router.push('/customer-success/tickets')
    router.refresh()
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentBody.trim()) return
    setSubmitting(true)
    await fetch(`/api/v1/tickets/${ticket.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentBody, isInternal }),
    })
    setCommentBody('')
    setSubmitting(false)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Delete confirmation modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDelete(false)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-panel p-6 w-full max-w-sm mx-4 space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-mvr-primary">Delete Ticket</h2>
              <p className="text-sm text-gray-500">This action cannot be undone. Are you sure?</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 py-2 text-sm font-medium border border-[#E0DBD4] rounded-lg hover:bg-mvr-neutral transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/customer-success/tickets"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to tickets
        </Link>
        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete Ticket
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg border p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', OTA_COLORS[ticket.source])}>
                {OTA_LABELS[ticket.source]}
              </span>
              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[ticket.status])}>
                {STATUS_LABELS[ticket.status]}
              </span>
              {ticket.confirmationCode && (
                <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  {ticket.confirmationCode}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-mvr-primary">{ticket.subject}</h1>
            <p className="text-sm text-gray-500">
              From <span className="font-medium">{ticket.guestName ?? ticket.fromEmail}</span>
              {ticket.guestName && <span className="text-gray-400"> · {ticket.fromEmail}</span>}
              <span className="text-gray-400"> · {new Date(ticket.createdAt).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}</span>
            </p>
          </div>
        </div>

        {/* Email body */}
        <div className="bg-gray-50 rounded-md p-4 text-sm text-gray-700 whitespace-pre-wrap border">
          {ticket.body}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Comments thread */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Comments</h2>

          {ticket.comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {ticket.comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'rounded-lg border p-4 space-y-2',
                comment.isInternal ? 'bg-amber-50 border-amber-200' : 'bg-white',
              )}
            >
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5 font-medium text-gray-700">
                  <User className="w-3 h-3" />
                  {comment.author?.name ?? (comment.source === 'n8n' ? 'n8n (automation)' : 'System')}
                  {comment.isInternal && (
                    <span className="text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide">
                      Internal
                    </span>
                  )}
                </span>
                <span>{new Date(comment.createdAt).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}</span>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}

          {/* Add comment */}
          <form onSubmit={submitComment} className="space-y-2">
            <textarea
              className="w-full text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 resize-none"
              rows={3}
              placeholder="Add a comment..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                />
                Internal note
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || !commentBody.trim()}
                className="bg-mvr-primary hover:bg-mvr-primary/90"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {submitting ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        </div>

        {/* Sidebar: controls */}
        <div className="space-y-4">
          {/* Status */}
          <div className="bg-white rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
            <select
              className="w-full text-sm border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30"
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
            >
              {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Assignee */}
          <div className="bg-white rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assigned to</p>
            <select
              className="w-full text-sm border rounded-md px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/30"
              value={ticket.assignedTo?.id ?? ''}
              onChange={(e) => handleAssigneeChange(e.target.value)}
            >
              <option value="">Unassigned</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name ?? a.id}</option>
              ))}
            </select>
          </div>

          {/* Property */}
          <div className="bg-white rounded-lg border p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Property</p>
            {ticket.building ? (
              <div className="text-sm space-y-0.5">
                <p className="font-medium text-gray-800">{ticket.building.name}</p>
                {ticket.unit && <p className="text-gray-500">Unit {ticket.unit.number}</p>}
                {ticket.listing && (
                  <Link
                    href={`/data-master/listings/${ticket.listing.id}`}
                    className="text-xs text-mvr-primary hover:underline"
                  >
                    {ticket.listing.name}
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Not linked</p>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-lg border p-4 space-y-2 text-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</p>
            <div className="space-y-1 text-gray-600">
              <p><span className="text-gray-400">Confirmation:</span> {ticket.confirmationCode ?? '—'}</p>
              <p><span className="text-gray-400">Guest:</span> {ticket.guestName ?? '—'}</p>
              <p><span className="text-gray-400">From:</span> {ticket.fromEmail}</p>
              {ticket.resolvedAt && (
                <p><span className="text-gray-400">Resolved:</span>{' '}
                  {new Date(ticket.resolvedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
