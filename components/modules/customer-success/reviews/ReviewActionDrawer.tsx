'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import {
  REVIEW_ACTION_STATUSES,
  type ReviewActionPatch,
  type ReviewActionRow,
  type ReviewActionStatus,
  type ReviewWithAction,
} from '@/lib/reviews/types'

interface Props {
  review:          ReviewWithAction
  assigneeOptions: Array<{ id: string; name: string }>
  onClose:         () => void
  onSaved:         (merged: ReviewWithAction) => void
}

const STATUS_LABELS: Record<ReviewActionStatus, string> = {
  new:              'New',
  under_review:     'Under review',
  no_action:        'No action — do not dispute',
  disputing:        'Disputing',
  dispute_won:      'Dispute won (review removed)',
  dispute_lost:     'Dispute lost (review stays)',
  closed_no_change: 'Closed (no change)',
}

export function ReviewActionDrawer({ review, assigneeOptions, onClose, onSaved }: Props) {
  const current = review.action
  const [status, setStatus]                   = useState<ReviewActionStatus>(current?.status ?? 'new')
  const [assignedToId, setAssignedToId]       = useState<string>(current?.assignedToId ?? '')
  const [disputeDecision, setDisputeDecision] = useState<string>(current?.disputeDecision    ?? '')
  const [disputeOutcome,  setDisputeOutcome]  = useState<string>(current?.disputeOutcomeNote ?? '')
  const [internalNotes,   setInternalNotes]   = useState<string>(current?.internalNotes      ?? '')
  const [saving, setSaving]                   = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    const patch: ReviewActionPatch = {
      otaSource:          review.otaSource,
      externalReviewId:   review.id,
      status,
      assignedToId:       assignedToId || null,
      disputeDecision:    disputeDecision.trim() || null,
      disputeOutcomeNote: disputeOutcome.trim()  || null,
      internalNotes:      internalNotes.trim()   || null,
    }
    try {
      const res  = await fetch('/api/v1/reviews/actions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const json = await res.json() as { data?: ReviewActionRow; error?: string }
      if (!res.ok || !json.data) {
        toast.error(json.error ?? 'Failed to save action')
        setSaving(false)
        return
      }
      toast.success('Review action saved')
      onSaved({ ...review, action: json.data })
    } catch (err) {
      console.error(err)
      toast.error('Network error saving action')
      setSaving(false)
    }
  }

  const showDisputeOutcome =
    status === 'dispute_won'   ||
    status === 'dispute_lost'  ||
    status === 'closed_no_change'

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} aria-hidden />
      <aside className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-panel flex flex-col">
        <header className="flex items-start justify-between gap-3 p-4 border-b border-[#E0DBD4]">
          <div>
            <h2 className="font-display text-xl text-mvr-primary">Review action</h2>
            <p className="text-xs text-muted-foreground">
              {review.unitName ?? 'Unknown unit'} · {review.channelName || 'Unknown channel'} ·{' '}
              <span className="font-semibold">{review.rating ?? '—'}★</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-mvr-primary">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
          <section>
            <label className="block text-xs font-semibold text-mvr-primary mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReviewActionStatus)}
              className="w-full rounded-md border border-[#E0DBD4] px-2 py-1.5 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            >
              {REVIEW_ACTION_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </section>

          <section>
            <label className="block text-xs font-semibold text-mvr-primary mb-1">Assignee</label>
            <select
              value={assignedToId}
              onChange={(e) => setAssignedToId(e.target.value)}
              className="w-full rounded-md border border-[#E0DBD4] px-2 py-1.5 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            >
              <option value="">Unassigned</option>
              {assigneeOptions.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </section>

          <section>
            <label className="block text-xs font-semibold text-mvr-primary mb-1">
              Dispute decision <span className="text-muted-foreground font-normal">(why dispute / why not)</span>
            </label>
            <textarea
              value={disputeDecision}
              onChange={(e) => setDisputeDecision(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#E0DBD4] px-2 py-1.5 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              placeholder="e.g. Guest cleanliness complaint not supported by check-in inspection photos."
            />
          </section>

          {showDisputeOutcome ? (
            <section>
              <label className="block text-xs font-semibold text-mvr-primary mb-1">Dispute outcome notes</label>
              <textarea
                value={disputeOutcome}
                onChange={(e) => setDisputeOutcome(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-[#E0DBD4] px-2 py-1.5 focus:ring-mvr-primary/20 focus:border-mvr-primary"
                placeholder="OTA decision detail / case id / etc."
              />
            </section>
          ) : null}

          <section>
            <label className="block text-xs font-semibold text-mvr-primary mb-1">Internal notes</label>
            <textarea
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-[#E0DBD4] px-2 py-1.5 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              placeholder="Anything the team should know."
            />
          </section>

          {current ? (
            <p className="text-xs text-muted-foreground pt-2 border-t border-[#E0DBD4]">
              Last updated {new Date(current.updatedAt).toLocaleString()}
              {current.firstActionedAt ? <> · First actioned {new Date(current.firstActionedAt).toLocaleDateString()}</> : null}
              {current.closedAt ? <> · Closed {new Date(current.closedAt).toLocaleDateString()}</> : null}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground pt-2 border-t border-[#E0DBD4]">
              No action recorded yet — this will be the first.
            </p>
          )}
        </div>

        <footer className="p-4 border-t border-[#E0DBD4] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-3 py-2 text-sm font-medium text-mvr-primary border border-[#E0DBD4] rounded-md hover:bg-mvr-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm font-medium text-white bg-mvr-primary rounded-md hover:bg-mvr-primary/90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save action'}
          </button>
        </footer>
      </aside>
    </div>
  )
}
