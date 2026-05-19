'use client'

import { useEffect, useState } from 'react'
import { Loader2, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import type { ReviewWithAction, ReviewActionStatus, UnitSummary } from '@/lib/reviews/types'

interface Props {
  review:    ReviewWithAction
  onClose:   () => void
  /** Called when the user clicks "Take action" — the parent should close
   *  this modal and open the existing ReviewActionDrawer with the same row. */
  onAction?: (review: ReviewWithAction) => void
}

const OTA_LABEL: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking', vrbo: 'Vrbo',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}
// Same icon set as CellDetailPanel / TicketList. Vacasa has no asset yet —
// the tile falls back to the text label in that case.
const OTA_ICON: Partial<Record<OtaSource, string>> = {
  airbnb:  '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  vrbo:    '/icons/ota-vrbo.png',
  expedia: '/icons/ota-expedia.png',
  other:   '/icons/ota-other.png',
}

// Channel display order for the "Average rating by channel" widget. Anything
// not in this list lands at the end, in the order it arrived from BQ.
const OTA_DISPLAY_ORDER: OtaSource[] = ['airbnb', 'booking', 'expedia', 'vrbo', 'vacasa', 'other']
function otaSortIndex(o: OtaSource): number {
  const i = OTA_DISPLAY_ORDER.indexOf(o)
  return i === -1 ? OTA_DISPLAY_ORDER.length : i
}

const STATUS_LABELS: Record<ReviewActionStatus, string> = {
  new:              'New',
  under_review:     'Under review',
  no_action:        'No action — do not dispute',
  disputing:        'Disputing',
  dispute_won:      'Dispute won',
  dispute_lost:     'Dispute lost',
  closed_no_change: 'Closed (no change)',
}

const STATUS_TONE: Record<ReviewActionStatus, string> = {
  new:              'bg-mvr-neutral text-mvr-olive',
  under_review:     'bg-mvr-steel-light text-mvr-primary',
  no_action:        'bg-mvr-neutral text-mvr-olive',
  disputing:        'bg-mvr-warning-light text-mvr-warning',
  dispute_won:      'bg-mvr-success-light text-mvr-success',
  dispute_lost:     'bg-mvr-danger-light text-mvr-danger',
  closed_no_change: 'bg-mvr-neutral text-mvr-olive',
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  // 'YYYY-MM-DD' from BQ — render in the user's locale without timezone drift.
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function ReviewDetailModal({ review, onClose, onAction }: Props) {
  const [unit, setUnit]       = useState<UnitSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  // Close on Escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Load the unit-wide summary when the modal opens. Aborts cleanly when the
  // user closes mid-flight or jumps to a different review.
  useEffect(() => {
    const unitName = review.unitName
    if (!unitName) { setLoading(false); return }
    const ctrl = new AbortController()
    setLoading(true)
    setError(null)
    setUnit(null)
    fetch(`/api/v1/reviews/unit-summary?unit=${encodeURIComponent(unitName)}`, { signal: ctrl.signal })
      .then(async (res) => {
        const json = await res.json() as { data?: UnitSummary; error?: string }
        if (!res.ok || !json.data) throw new Error(json.error ?? `Request failed (${res.status})`)
        setUnit(json.data)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load unit summary')
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [review.unitName])

  const status = review.action?.status ?? null
  const rating = review.rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Review detail"
        className="relative bg-white rounded-xl shadow-panel w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E0DBD4]">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {rating != null && rating >= 4 ? (
                <ThumbsUp className="w-4 h-4 text-mvr-success" />
              ) : rating != null && rating <= 3 ? (
                <ThumbsDown className="w-4 h-4 text-mvr-danger" />
              ) : null}
              <h2 className="font-display text-xl text-mvr-primary truncate">
                {review.unitName ?? 'Unknown unit'}
              </h2>
              <span className="inline-flex items-center gap-1 text-mvr-warning font-semibold text-sm">
                <Star className="w-3.5 h-3.5 fill-current" />
                {rating ?? '—'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-mvr-primary hover:bg-mvr-cream rounded-md p-1 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm">
          {/* ── Average rating by channel (above the snapshot card) ───── */}
          {unit && unit.byOta.length > 0 ? (
            <section>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
                Average rating by channel
              </p>
              <div className="flex flex-wrap items-start justify-around gap-4 sm:gap-6">
                {[...unit.byOta]
                  .sort((a, b) => otaSortIndex(a.otaSource) - otaSortIndex(b.otaSource))
                  .map((o) => {
                    const iconSrc = OTA_ICON[o.otaSource]
                    return (
                      <div
                        key={o.otaSource}
                        className="flex flex-col items-center min-w-[72px]"
                      >
                        <p className="text-mvr-primary font-semibold text-2xl tabular-nums leading-none">
                          {o.avgRating == null ? '—' : o.avgRating.toFixed(1)}
                        </p>
                        <div className="h-7 mt-2 flex items-center justify-center">
                          {iconSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={iconSrc}
                              alt={OTA_LABEL[o.otaSource]}
                              className="h-6 max-w-[80px] object-contain"
                            />
                          ) : (
                            <span className="text-mvr-primary font-medium text-xs">
                              {OTA_LABEL[o.otaSource]}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground tabular-nums mt-1 whitespace-nowrap">
                          {o.count.toLocaleString()} reviews
                        </p>
                      </div>
                    )
                  })}
              </div>
            </section>
          ) : null}

          {/* ── Unit snapshot (totals + star distribution only) ─────────── */}
          <section className="rounded-lg border border-[#E0DBD4] bg-mvr-cream/40 px-4 py-3">
            <div className="flex items-baseline justify-between gap-2 mb-2">
              <h3 className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
                Unit snapshot
              </h3>
              <p className="text-[10px] text-muted-foreground">Full history</p>
            </div>

            {loading ? (
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading unit history…
              </div>
            ) : error ? (
              <p className="text-xs text-mvr-danger">{error}</p>
            ) : !unit || unit.totalReviews === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No prior review history for this unit.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-baseline gap-6 flex-wrap">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total reviews</p>
                    <p className="text-mvr-primary font-semibold text-lg tabular-nums leading-tight">
                      {unit.totalReviews.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Avg rating</p>
                    <p className="text-mvr-primary font-semibold text-lg tabular-nums leading-tight inline-flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-current text-mvr-warning" />
                      {unit.avgRating == null ? '—' : unit.avgRating.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* Star distribution */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">
                    Star distribution
                  </p>
                  <div className="space-y-1.5">
                    {(['5', '4', '3', '2', '1'] as const).map((bucket) => {
                      const count = unit.ratingBuckets[bucket]
                      const pct   = unit.totalReviews > 0 ? (count / unit.totalReviews) * 100 : 0
                      return (
                        <div key={bucket} className="flex items-center gap-3 text-xs">
                          <span className="w-8 shrink-0 text-mvr-olive tabular-nums inline-flex items-center gap-0.5">
                            {bucket}<Star className="w-3 h-3 fill-current text-mvr-warning" />
                          </span>
                          <div className="flex-1 h-2 bg-mvr-neutral rounded-full overflow-hidden">
                            <div
                              className="h-full bg-mvr-primary"
                              style={{ width: `${pct.toFixed(1)}%` }}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right tabular-nums text-mvr-primary font-medium whitespace-nowrap">
                            {count.toLocaleString()}
                          </span>
                          <span className="w-10 shrink-0 text-right tabular-nums text-muted-foreground whitespace-nowrap">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Review detail ────────────────────────────────────────────── */}
          <section className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
              Review detail
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              <Field label="Guest"       value={review.guestName} />
              <Field label="Channel"     value={OTA_LABEL[review.otaSource]} />
              <Field label="Date"        value={fmtDate(review.date)} />
              <Field label="Rating"      value={rating != null ? `${rating} ★` : '—'} />
              <Field
                label="Booking / Reservation ID"
                value={review.reservationId}
                mono
              />
              <Field label="Display on website" value={review.displayOnWebsite ? 'Yes' : 'No'} />
            </dl>

            {review.title ? (
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">Title</p>
                <p className="text-mvr-primary font-medium">{review.title}</p>
              </div>
            ) : null}

            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                Review
              </p>
              <p className="text-mvr-olive whitespace-pre-wrap leading-relaxed">
                {review.description?.trim() ? review.description : <span className="italic text-muted-foreground">No comment left.</span>}
              </p>
            </div>

            {/* Tags */}
            {(review.positiveTags.length > 0 || review.negativeTags.length > 0) ? (
              <div className="space-y-1.5">
                {review.positiveTags.length > 0 ? (
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">
                      Positive
                    </span>
                    {review.positiveTags.map((t) => (
                      <span
                        key={`p-${t}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-mvr-success-light text-mvr-success text-[11px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
                {review.negativeTags.length > 0 ? (
                  <div className="flex items-start gap-2 flex-wrap">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground pt-0.5">
                      Negative
                    </span>
                    {review.negativeTags.map((t) => (
                      <span
                        key={`n-${t}`}
                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-mvr-danger-light text-mvr-danger text-[11px] font-medium"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Host response */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                Host response {review.hostResponded ? '· sent' : '· none'}
              </p>
              {review.hostResponded && review.hostResponseText?.trim() ? (
                <div className="rounded-md border border-mvr-steel-light bg-mvr-steel-light/40 px-3 py-2 text-mvr-olive whitespace-pre-wrap leading-relaxed">
                  {review.hostResponseText}
                </div>
              ) : (
                <p className="italic text-muted-foreground">
                  {review.hostResponded ? 'Host marked as responded, but no text recorded.' : 'We have not replied yet.'}
                </p>
              )}
            </div>

            {/* Action / dispute state */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                Action status
              </p>
              {status ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_TONE[status]}`}
                  >
                    {STATUS_LABELS[status]}
                  </span>
                  {review.action?.assignedToName ? (
                    <span className="text-xs text-muted-foreground">
                      Assigned to <span className="text-mvr-olive">{review.action.assignedToName}</span>
                    </span>
                  ) : null}
                  {review.action?.aiRecommendation ? (
                    <span className="text-xs text-muted-foreground">
                      AI: <span className="text-mvr-olive">{review.action.aiRecommendation}</span>
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="italic text-muted-foreground text-xs">
                  No action recorded yet. Click <strong>Take action</strong> to start the workflow.
                </p>
              )}

              {review.action?.disputeDecision ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Dispute decision
                  </p>
                  <p className="text-mvr-olive whitespace-pre-wrap text-xs">{review.action.disputeDecision}</p>
                </div>
              ) : null}

              {review.action?.disputeOutcomeNote ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Dispute outcome
                  </p>
                  <p className="text-mvr-olive whitespace-pre-wrap text-xs">{review.action.disputeOutcomeNote}</p>
                </div>
              ) : null}

              {review.action?.internalNotes ? (
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                    Internal notes
                  </p>
                  <p className="text-mvr-olive whitespace-pre-wrap text-xs">{review.action.internalNotes}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t border-[#E0DBD4] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-mvr-primary border border-[#E0DBD4] rounded-md hover:bg-mvr-cream"
          >
            Close
          </button>
          {onAction ? (
            <button
              type="button"
              onClick={() => onAction(review)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-mvr-primary rounded-md hover:bg-mvr-primary/90"
            >
              Take action
            </button>
          ) : null}
        </footer>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  value: string | null | undefined
  mono?: boolean
}
function Field({ label, value, mono = false }: FieldProps) {
  return (
    <div className="flex items-baseline gap-2 min-w-0">
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{label}</dt>
      <dd className={`text-mvr-olive truncate ${mono ? 'font-mono text-[11px]' : ''}`} title={value ?? ''}>
        {value && value.trim() ? value : '—'}
      </dd>
    </div>
  )
}
