'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Sparkles, Star, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DISPUTE_OTA_LABELS,
  DISPUTE_OTAS,
  caseTypeLabelOf,
  resolveStatusMeta,
  statusesForType,
  successProb,
  type CaseListItem,
  type CaseStatusDef,
  type CaseTypeDef,
  type DisputeCaseStatusT,
  type DisputeCaseTypeT,
  type DisputeOta,
} from '@/lib/disputes/types'
import {
  useAppendCaseLog,
  useCaseConversation,
  useCaseLog,
  useCaseTypes,
  useCases,
  type CaseFilters,
} from './useDisputeQueries'
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

function StatusBadge({
  types,
  typeKey,
  status,
}: {
  types: CaseTypeDef[]
  typeKey: string | null
  status: DisputeCaseStatusT
}) {
  const meta = resolveStatusMeta(types, typeKey, status)
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
  initialCaseTypes: CaseTypeDef[]
}

export function TrackerTab({ initialCases, initialCaseTypes }: Props) {
  const { data: caseTypes = [] } = useCaseTypes(initialCaseTypes)
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

  // Status filter options = the union of every type's stages (deduped by key).
  const allStatuses = useMemo(() => {
    const seen = new Map<string, CaseStatusDef>()
    for (const t of caseTypes) for (const s of t.statuses) if (!seen.has(s.key)) seen.set(s.key, s)
    return Array.from(seen.values())
  }, [caseTypes])

  function toggle<T>(arr: T[], v: T, set: (next: T[]) => void) {
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[#E0DBD4] bg-white p-3 shadow-card">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Type</span>
        {caseTypes.map((t) => (
          <FilterChip key={t.key} active={typeFilter.includes(t.key)} label={t.label} onClick={() => toggle(typeFilter, t.key, setTypeFilter)} />
        ))}
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">OTA</span>
        {DISPUTE_OTAS.map((o) => (
          <FilterChip key={o} active={otaFilter.includes(o)} label={DISPUTE_OTA_LABELS[o]} onClick={() => toggle(otaFilter, o, setOtaFilter)} />
        ))}
        <span className="ml-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</span>
        {allStatuses.map((s) => (
          <FilterChip key={s.key} active={statusFilter.includes(s.key)} label={s.label} onClick={() => toggle(statusFilter, s.key, setStatusFilter)} />
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
                  <td className="px-4 py-3 text-mvr-olive">{caseTypeLabelOf(caseTypes, c.caseType)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 text-mvr-olive">
                      <OtaIcon ota={c.ota} className="h-4 w-4" />
                      {DISPUTE_OTA_LABELS[c.ota]}
                    </span>
                  </td>
                  <td className="px-4 py-3"><SuccessPill caseItem={c} /></td>
                  <td className="px-4 py-3"><StatusBadge types={caseTypes} typeKey={c.caseType} status={c.status} /></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.createdByName ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selected ? (
        <CaseDetail
          key={selected.id}
          caseItem={selected}
          types={caseTypes}
          onClose={() => setSelected(null)}
          onResolved={(c) => setSelected(c)}
        />
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

// ─── Slide-over case detail (tabbed: Analysis / Conversation / Review) ─────────
// The header, booking summary, and the status control + activity log all stay
// fixed; only the active tab's content scrolls. The status card is the single
// place to change status and log updates; its activity log is collapsible.
function CaseDetail({
  caseItem,
  types,
  onClose,
  onResolved,
}: {
  caseItem: CaseListItem
  types: CaseTypeDef[]
  onClose: () => void
  onResolved: (c: CaseListItem) => void
}) {
  const conversation = useCaseConversation(caseItem.id)
  const log = useCaseLog(caseItem.id)
  const append = useAppendCaseLog()
  const validStatuses = statusesForType(types, caseItem.caseType)
  const isReview = caseItem.caseType === 'review'
  const [status, setStatus] = useState<DisputeCaseStatusT>(caseItem.status)
  const [note, setNote] = useState('')
  const [logOpen, setLogOpen] = useState(false)

  const meta = caseItem.reservationMeta
  // Review tab surfaces ONLY the dedicated review snapshot — never fall back to
  // inputText, which can hold the conversation/support chat. No review → nothing.
  const reviewText = meta?.reviewText ?? null
  const reviewRating = typeof meta?.reviewRating === 'number' ? meta.reviewRating : null

  const statusChanged = status !== caseItem.status
  const canSave = statusChanged || note.trim().length > 0
  const logCount = (log.data ?? []).length

  async function handleSaveUpdate() {
    if (!canSave) return
    const res = await append.mutateAsync({
      id: caseItem.id,
      status,
      note: note.trim() || undefined,
    })
    onResolved(res.case)
    setNote('')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-mvr-cream shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (fixed) */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E0DBD4] bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate font-display text-xl text-mvr-primary">
              {caseItem.title || caseItem.guestName || 'Dispute case'}
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>{caseTypeLabelOf(types, caseItem.caseType)}</span>
              <span className="inline-flex items-center gap-1"><OtaIcon ota={caseItem.ota} className="h-3.5 w-3.5" />{DISPUTE_OTA_LABELS[caseItem.ota]}</span>
              {caseItem.createdByName ? <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{caseItem.createdByName}</span> : null}
              <span>{new Date(caseItem.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SuccessPill caseItem={caseItem} withLabel />
            <StatusBadge types={types} typeKey={caseItem.caseType} status={caseItem.status} />
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-mvr-steel hover:bg-mvr-neutral" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Fixed context: booking summary + status control + collapsible activity log */}
        <div className="shrink-0 space-y-3 border-b border-[#E0DBD4] px-6 py-3">
          {meta ? <ReservationSummary caseItem={caseItem} /> : null}

          <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-2">
                {validStatuses.map((s) => (
                  <FilterChip key={s.key} active={status === s.key} label={s.label} onClick={() => setStatus(s.key)} />
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Update
              </label>
              <textarea
                className="min-h-[72px] w-full resize-y rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive focus:border-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Log what happened — what you did, the OTA's response, the next step…"
              />
            </div>
            <Button onClick={handleSaveUpdate} disabled={append.isPending || !canSave}>
              {append.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save update
            </Button>
            {append.isError ? <p className="text-sm text-mvr-danger">{(append.error as Error).message}</p> : null}

            {/* Activity log — collapsible (newest first) */}
            <div className="border-t border-[#E0DBD4] pt-3">
              <button
                type="button"
                onClick={() => setLogOpen((v) => !v)}
                className="flex w-full items-center gap-1.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground hover:text-mvr-primary"
              >
                {logOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Activity log{logCount ? ` (${logCount})` : ''}
              </button>
              {logOpen ? (
                <div className="mt-2 max-h-60 space-y-2 overflow-y-auto pr-1">
                  {log.isLoading ? (
                    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
                    </div>
                  ) : log.isError ? (
                    <p className="text-sm text-mvr-danger">Could not load the activity log.</p>
                  ) : logCount === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#E0DBD4] bg-mvr-cream/50 p-3 text-center text-xs text-muted-foreground">
                      No updates logged yet. Save a status change or note above to start the history.
                    </p>
                  ) : (
                    <ol className="space-y-2">
                      {(log.data ?? []).map((ev) => (
                        <li key={ev.id} className="rounded-lg border border-[#E0DBD4] bg-mvr-cream/40 p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge types={types} typeKey={caseItem.caseType} status={ev.status} />
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(ev.createdAt).toLocaleString()}
                              {ev.createdByName ? ` · ${ev.createdByName}` : ''}
                            </span>
                          </div>
                          {ev.note ? (
                            <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-mvr-olive">{ev.note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Tabs — bar fixed, only the panel below scrolls */}
        <Tabs defaultValue="analysis" className="flex min-h-0 flex-1 flex-col gap-0">
          <TabsList variant="line" className="shrink-0 w-full justify-start border-b border-[#E0DBD4] px-6">
            <TabsTrigger value="analysis" className="gap-1.5 px-3 text-sm">
              <Sparkles className="h-3.5 w-3.5" /> Analysis
            </TabsTrigger>
            <TabsTrigger value="conversation" className="gap-1.5 px-3 text-sm">Conversation</TabsTrigger>
            {isReview ? <TabsTrigger value="review" className="gap-1.5 px-3 text-sm">Review</TabsTrigger> : null}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            {/* Analysis — AI result only (no % bar, no raw input) */}
            <TabsContent value="analysis">
              <ResultView
                probs={caseItem.probs}
                resultText={caseItem.resultText}
                caseType={caseItem.caseType}
                showProbs={false}
              />
            </TabsContent>

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

            {/* Review — review-type cases only; the actual review, or nothing */}
            {isReview ? (
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
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No review text was captured for this case.</p>
                )}
              </TabsContent>
            ) : null}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
