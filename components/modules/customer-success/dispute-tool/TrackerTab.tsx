'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Sparkles, Star, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DISPUTA_STATUSES,
  DISPUTE_OTA_LABELS,
  DISPUTE_OTAS,
  REVIEW_STATUSES,
  successProb,
  type CaseListItem,
  type DisputeCaseStatusT,
  type DisputeCaseTypeT,
  type DisputeOta,
} from '@/lib/disputes/types'
import { useCaseConversation, useCases, useResolveCase, type CaseFilters } from './useDisputeQueries'
import { ResultView } from './ResultView'
import { ConversationInbox } from './ConversationInbox'
import { OtaIcon } from './OtaIcon'

// Success-probability tone, mirroring ResultView's spec §7.3 thresholds.
function probTone(value: number): string {
  if (value >= 70) return 'bg-mvr-success-light text-mvr-success'
  if (value >= 40) return 'bg-mvr-warning-light text-mvr-warning'
  return 'bg-mvr-danger-light text-mvr-danger'
}

function SuccessPill({ caseItem, withLabel }: { caseItem: CaseListItem; withLabel?: boolean }) {
  const sp = successProb(caseItem.probs, caseItem.caseType)
  if (!sp) return <span className="text-xs text-muted-foreground">—</span>
  return (
    <span
      title={`${sp.label} probability`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${probTone(sp.value)}`}
    >
      {sp.value}%{withLabel ? <span className="font-normal opacity-80">{sp.label}</span> : null}
    </span>
  )
}

const STATUS_META: Record<DisputeCaseStatusT, { label: string; cls: string }> = {
  disputing: { label: 'Disputing', cls: 'bg-mvr-primary-light text-mvr-primary' },
  removed: { label: 'Removed', cls: 'bg-mvr-success-light text-mvr-success' },
  notremoved: { label: 'Not removed', cls: 'bg-mvr-danger-light text-mvr-danger' },
  open: { label: 'Open', cls: 'bg-mvr-steel-light text-mvr-primary' },
  won: { label: 'Won', cls: 'bg-mvr-success-light text-mvr-success' },
  lost: { label: 'Lost', cls: 'bg-mvr-danger-light text-mvr-danger' },
}

function StatusBadge({ status }: { status: DisputeCaseStatusT }) {
  const meta = STATUS_META[status]
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>{meta.label}</span>
}

function FilterChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        active
          ? 'border-mvr-primary bg-mvr-primary text-white'
          : 'border-[#E0DBD4] text-mvr-olive hover:bg-mvr-neutral'
      }`}
    >
      {label}
    </button>
  )
}

interface Props {
  initialCases: CaseListItem[]
}

export function TrackerTab({ initialCases }: Props) {
  const [statusFilter, setStatusFilter] = useState<DisputeCaseStatusT[]>([])
  const [otaFilter, setOtaFilter] = useState<DisputeOta[]>([])
  const [typeFilter, setTypeFilter] = useState<DisputeCaseTypeT[]>([])
  const [selected, setSelected] = useState<CaseListItem | null>(null)

  const filters: CaseFilters = useMemo(
    () => ({ status: statusFilter, ota: otaFilter, caseType: typeFilter }),
    [statusFilter, otaFilter, typeFilter]
  )
  // initialData only applies to the unfiltered first render.
  const noFilters = !statusFilter.length && !otaFilter.length && !typeFilter.length
  const { data: cases = [], isLoading } = useCases(filters, noFilters ? initialCases : undefined)

  function toggle<T>(arr: T[], v: T, set: (next: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E0DBD4] bg-white p-3 shadow-card">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</span>
        <FilterChip active={typeFilter.includes('review')} label="Review" onClick={() => toggle(typeFilter, 'review', setTypeFilter)} />
        <FilterChip active={typeFilter.includes('disputa')} label="Dispute" onClick={() => toggle(typeFilter, 'disputa', setTypeFilter)} />
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">OTA</span>
        {DISPUTE_OTAS.map((o) => (
          <FilterChip key={o} active={otaFilter.includes(o)} label={DISPUTE_OTA_LABELS[o]} onClick={() => toggle(otaFilter, o, setOtaFilter)} />
        ))}
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
        {([...REVIEW_STATUSES, ...DISPUTA_STATUSES] as DisputeCaseStatusT[]).map((s) => (
          <FilterChip key={s} active={statusFilter.includes(s)} label={STATUS_META[s].label} onClick={() => toggle(statusFilter, s, setStatusFilter)} />
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[#E0DBD4] bg-white shadow-card">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading cases…
          </div>
        ) : cases.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No cases match the current filters.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">Case</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">OTA</th>
                <th className="px-4 py-2 font-medium">Success</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">By</th>
                <th className="px-4 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-[#E0DBD4] last:border-0 hover:bg-mvr-neutral"
                >
                  <td className="max-w-[320px] px-4 py-3">
                    <div className="truncate font-medium text-mvr-primary">
                      {c.title || c.guestName || c.inputText.slice(0, 60) || 'Untitled case'}
                    </div>
                    {c.reservationRef ? (
                      <div className="text-xs text-muted-foreground">Ref {c.reservationRef}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-mvr-olive">{c.caseType === 'review' ? 'Review' : 'Dispute'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-mvr-olive">
                      <OtaIcon ota={c.ota} className="h-4 w-4" />
                      {DISPUTE_OTA_LABELS[c.ota]}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SuccessPill caseItem={c} /></td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.createdByName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected ? (
        <CaseDetail caseItem={selected} onClose={() => setSelected(null)} onResolved={(c) => setSelected(c)} />
      ) : null}
    </div>
  )
}

// Stars when the rating is on a 1–5 scale; otherwise the raw number (e.g. Booking 1–10).
function RatingDisplay({ rating }: { rating: number }) {
  if (rating > 0 && rating <= 5) {
    const full = Math.round(rating)
    return (
      <span className="inline-flex items-center gap-0.5" title={`${rating} / 5`}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className={`h-4 w-4 ${i <= full ? 'fill-mvr-warning text-mvr-warning' : 'text-mvr-steel'}`} />
        ))}
        <span className="ml-1 text-sm font-medium text-mvr-olive">{rating}</span>
      </span>
    )
  }
  return <span className="text-lg font-display text-mvr-primary">{rating}<span className="text-sm text-muted-foreground"> / 10</span></span>
}

function ReservationSummary({ caseItem }: { caseItem: CaseListItem }) {
  const m = caseItem.reservationMeta
  if (!m) return null
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-[#E0DBD4] bg-mvr-sand-light p-4 text-xs text-mvr-olive shadow-card sm:grid-cols-4">
      {m.confirmationCode ? <div><span className="text-muted-foreground">Code</span><div className="font-medium">{m.confirmationCode}</div></div> : null}
      {m.property ? <div><span className="text-muted-foreground">Building</span><div className="font-medium">{m.property}</div></div> : null}
      {m.unit ? <div><span className="text-muted-foreground">Unit</span><div className="font-medium">{m.unit}</div></div> : null}
      {m.nights != null ? <div><span className="text-muted-foreground">Nights</span><div className="font-medium">{m.nights}</div></div> : null}
      {m.checkinDate ? <div><span className="text-muted-foreground">Check-in</span><div className="font-medium">{m.checkinDate.slice(0, 10)}</div></div> : null}
      {m.checkoutDate ? <div><span className="text-muted-foreground">Check-out</span><div className="font-medium">{m.checkoutDate.slice(0, 10)}</div></div> : null}
      {m.payout != null ? <div><span className="text-muted-foreground">Payout</span><div className="font-medium">${m.payout.toLocaleString()}</div></div> : null}
      {m.adr != null ? <div><span className="text-muted-foreground">ADR</span><div className="font-medium">${m.adr.toLocaleString()}</div></div> : null}
    </div>
  )
}

// ─── Slide-over case detail + resolve (tabbed: Conversation / Review / Analysis) ─
function CaseDetail({
  caseItem,
  onClose,
  onResolved,
}: {
  caseItem: CaseListItem
  onClose: () => void
  onResolved: (c: CaseListItem) => void
}) {
  const resolve = useResolveCase()
  const conversation = useCaseConversation(caseItem.id)
  const validStatuses = caseItem.caseType === 'review' ? REVIEW_STATUSES : DISPUTA_STATUSES
  const [status, setStatus] = useState<DisputeCaseStatusT>(caseItem.status)
  const [outcomeNote, setOutcomeNote] = useState(caseItem.outcomeNote ?? '')
  const [showInput, setShowInput] = useState(false)

  const meta = caseItem.reservationMeta
  // Review-type cases store the review in inputText; dispute cases keep it in reservationMeta.
  const reviewText = meta?.reviewText ?? (caseItem.caseType === 'review' ? caseItem.inputText : null)
  const reviewRating = typeof meta?.reviewRating === 'number' ? meta.reviewRating : null

  async function handleSave() {
    const updated = await resolve.mutateAsync({ id: caseItem.id, status, outcomeNote: outcomeNote || undefined })
    onResolved(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-mvr-cream shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#E0DBD4] bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl text-mvr-primary">
              {caseItem.title || caseItem.guestName || 'Dispute case'}
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{caseItem.caseType === 'review' ? 'Review removal' : 'OTA dispute'}</span>
              <span className="inline-flex items-center gap-1"><OtaIcon ota={caseItem.ota} className="h-3.5 w-3.5" />{DISPUTE_OTA_LABELS[caseItem.ota]}</span>
              {caseItem.createdByName ? <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{caseItem.createdByName}</span> : null}
              <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SuccessPill caseItem={caseItem} withLabel />
            <StatusBadge status={caseItem.status} />
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-mvr-steel hover:bg-mvr-neutral" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {meta ? <div className="mb-4"><ReservationSummary caseItem={caseItem} /></div> : null}

          <Tabs defaultValue="conversation" className="!flex-col w-full">
            <TabsList variant="line" className="mb-4 w-full justify-start border-b border-[#E0DBD4]">
              <TabsTrigger value="conversation" className="gap-1.5 px-3 text-sm">Conversation</TabsTrigger>
              <TabsTrigger value="review" className="gap-1.5 px-3 text-sm">Review</TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1.5 px-3 text-sm">
                <Sparkles className="h-3.5 w-3.5" /> Analysis
              </TabsTrigger>
            </TabsList>

            {/* Conversation — inbox */}
            <TabsContent value="conversation">
              <ConversationInbox
                messages={conversation.data?.messages ?? []}
                isLoading={conversation.isLoading}
                isError={conversation.isError}
                guestName={caseItem.guestName}
                emptyHint="No guest conversation is linked to this case (it may have been entered manually)."
              />
            </TabsContent>

            {/* Review — overview */}
            <TabsContent value="review">
              {reviewText || reviewRating != null ? (
                <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
                  {reviewRating != null ? (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guest rating</span>
                      <RatingDisplay rating={reviewRating} />
                    </div>
                  ) : null}
                  {reviewText ? (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-mvr-olive">{reviewText}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No review text was captured.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[#E0DBD4] bg-mvr-cream/50 p-8 text-center text-sm text-muted-foreground">
                  <Star className="h-7 w-7 text-mvr-steel" />
                  No review is linked to this case.
                </div>
              )}
            </TabsContent>

            {/* Analysis — resolve + AI result */}
            <TabsContent value="analysis" className="space-y-4">
              <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {validStatuses.map((s) => (
                      <FilterChip key={s} active={status === s} label={STATUS_META[s].label} onClick={() => setStatus(s)} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Outcome note (what worked / didn&apos;t)
                  </label>
                  <textarea
                    className="min-h-[80px] w-full resize-y rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive focus:border-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
                    value={outcomeNote}
                    onChange={(e) => setOutcomeNote(e.target.value)}
                    placeholder="e.g. The extortion argument worked. Key evidence: screenshot of the threatening message."
                  />
                </div>
                <Button onClick={handleSave} disabled={resolve.isPending}>
                  {resolve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Save outcome
                </Button>
                {resolve.isError ? <p className="text-sm text-mvr-danger">{(resolve.error as Error).message}</p> : null}
              </div>

              {/* Analyzed input (collapsible — the raw text the AI processed) */}
              <div className="rounded-xl border border-[#E0DBD4] bg-white shadow-card">
                <button
                  type="button"
                  onClick={() => setShowInput((v) => !v)}
                  className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground"
                >
                  {showInput ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  Analyzed input
                </button>
                {showInput ? (
                  <div className="border-t border-[#E0DBD4] px-4 py-3">
                    <p className="max-h-72 overflow-auto whitespace-pre-wrap text-sm text-mvr-olive">{caseItem.inputText}</p>
                    {caseItem.monto ? <p className="mt-2 text-sm text-mvr-olive"><span className="font-medium">Amount:</span> {caseItem.monto}</p> : null}
                  </div>
                ) : null}
              </div>

              <ResultView probs={caseItem.probs} resultText={caseItem.resultText} caseType={caseItem.caseType} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
