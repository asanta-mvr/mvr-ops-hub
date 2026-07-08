'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, Check, ImagePlus, Loader2, MessagesSquare, Plus, Search, Sparkles, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DISPUTE_OTAS,
  findCaseType,
  type AnalyzeResult,
  type CaseTypeDef,
  type DisputeCaseTypeT,
  type DisputeOta,
  type ReservationMeta,
  type StatusTone,
} from '@/lib/disputes/types'
import {
  lookupReservationByCode,
  useAnalyze,
  useCaseTypes,
  useCreateCase,
  useCreateCaseType,
  uploadEvidence,
  type ReservationLookupResult,
} from './useDisputeQueries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResultView } from './ResultView'
import { ConversationInbox } from './ConversationInbox'
import { OtaIcon } from './OtaIcon'

const INPUT_CLASS =
  'w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive placeholder:text-mvr-steel focus:border-mvr-primary focus:outline-none focus:ring-2 focus:ring-mvr-primary/20'

interface Evidence {
  path: string
  previewUrl: string
  name: string
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error'

function newDraftId(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`).replace(/-/g, '').slice(0, 32)
}

// MVR operates in Miami — render reservation timestamps in that local zone.
function fmtDateTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function fmtMoney(n: number | null): string | null {
  if (n == null) return null
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

// Stars on a 1–5 scale; otherwise the raw number (e.g. Booking's 1–10).
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
  return <span className="font-display text-lg text-mvr-primary">{rating}<span className="text-sm text-muted-foreground"> / 10</span></span>
}

export function AnalyzeTab({ initialCaseTypes }: { initialCaseTypes: CaseTypeDef[] }) {
  const analyze = useAnalyze()
  const create = useCreateCase()
  const { data: caseTypes = [] } = useCaseTypes(initialCaseTypes)
  const [draftId] = useState(newDraftId)
  // Set once the analyzed result is persisted via "Add to tracker".
  const [addedCaseId, setAddedCaseId] = useState<string | null>(null)
  const [newTypeOpen, setNewTypeOpen] = useState(false)

  // Lookup state
  const [lookupCode, setLookupCode] = useState('')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [reservation, setReservation] = useState<ReservationLookupResult['reservation'] | null>(null)
  const [conversation, setConversation] = useState<ReservationLookupResult['conversation']>(null)
  const [review, setReview] = useState<ReservationLookupResult['review']>(null)
  const [otaUnsupported, setOtaUnsupported] = useState(false)

  // Case fields
  const [caseType, setCaseType] = useState<DisputeCaseTypeT>('review')
  const [ota, setOta] = useState<DisputeOta>('airbnb')
  const [inputText, setInputText] = useState('')
  const [guestName, setGuestName] = useState('')
  const [reservationRef, setReservationRef] = useState('')
  const [monto, setMonto] = useState('')
  const [cronologia, setCronologia] = useState('')
  const [evidence, setEvidence] = useState<Evidence[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [result, setResult] = useState<(AnalyzeResult & { caseType: DisputeCaseTypeT }) | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedType = findCaseType(caseTypes, caseType)
  // Only the built-in OTA dispute carries the amount + timeline inputs.
  const showAmountTimeline = !!selectedType?.hasAmountTimeline

  // The analyzed text for a looked-up reservation: the review for review cases,
  // the conversation transcript for OTA disputes and custom types.
  function primaryTextFor(key: string): string {
    return key === 'review' ? review?.text ?? '' : conversation?.transcript ?? ''
  }

  function selectType(key: string) {
    setCaseType(key)
    if (reservation) setInputText(primaryTextFor(key))
    // The prior analysis is type-specific — clear it on a type switch.
    setResult(null)
    setAddedCaseId(null)
  }

  async function handleLookup() {
    const code = lookupCode.trim()
    if (!code) return
    setLookupState('loading')
    setLookupError(null)
    try {
      const data = await lookupReservationByCode(code)
      if (!data) {
        setLookupState('not_found')
        setReservation(null)
        return
      }
      const r = data.reservation
      setReservation(r)
      setConversation(data.conversation)
      setReview(data.review)

      // Prefill metadata
      setReservationRef(r.confirmationCode)
      if (r.guestName) setGuestName(r.guestName)

      // OTA — auto-select only if supported by the dispute tool's 4.
      if ((DISPUTE_OTAS as readonly string[]).includes(r.ota)) {
        setOta(r.ota as DisputeOta)
        setOtaUnsupported(false)
      } else {
        setOtaUnsupported(true)
      }

      // Default case type + primary input source.
      const hasReview = Boolean(data.review?.text)
      const nextType: DisputeCaseTypeT = hasReview ? 'review' : 'disputa'
      setCaseType(nextType)
      setInputText(nextType === 'review' ? data.review?.text ?? '' : data.conversation?.transcript ?? '')

      setLookupState('found')
    } catch (e) {
      setLookupState('error')
      setLookupError(e instanceof Error ? e.message : 'Lookup failed')
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setUploadError(null)
    try {
      for (const file of Array.from(files)) {
        const { path, previewUrl } = await uploadEvidence(draftId, file)
        setEvidence((prev) => [...prev, { path, previewUrl, name: file.name }])
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeEvidence(path: string) {
    setEvidence((prev) => prev.filter((e) => e.path !== path))
  }

  function buildReservationMeta(): ReservationMeta | undefined {
    if (!reservation) return undefined
    return {
      confirmationCode: reservation.confirmationCode,
      reservationId: reservation.reservationId,
      otaReservationId: reservation.otaReservationId,
      guestId: reservation.guestId,
      conversationId: reservation.conversationId,
      property: reservation.property,
      unit: reservation.unit,
      checkinDate: reservation.checkinDate,
      checkoutDate: reservation.checkoutDate,
      checkinAt: reservation.checkinAt,
      checkoutAt: reservation.checkoutAt,
      nights: reservation.nights,
      payout: reservation.payout,
      adr: reservation.adr,
      conversationText: conversation?.transcript ?? null,
      reviewText: review?.text ?? null,
      reviewRating: review?.rating ?? null,
    }
  }

  function analyzePayload() {
    return {
      caseType,
      ota,
      inputText,
      guestName: guestName || undefined,
      reservationRef: reservationRef || undefined,
      monto: showAmountTimeline ? monto || undefined : undefined,
      cronologia: showAmountTimeline ? cronologia || undefined : undefined,
      evidencePaths: evidence.map((e) => e.path),
      reservationMeta: buildReservationMeta(),
    }
  }

  async function handleAnalyze() {
    if (!inputText.trim()) return
    const res = await analyze.mutateAsync(analyzePayload())
    setResult({ probs: res.probs, resultText: res.resultText, caseType })
    setAddedCaseId(null) // a fresh analysis hasn't been added to the tracker yet
  }

  // Persist the analyzed result to the tracker (no AI re-run — the precomputed
  // verdict + probabilities travel with the payload).
  async function addToTracker() {
    if (!result) return
    const created = await create.mutateAsync({
      ...analyzePayload(),
      resultText: result.resultText ?? undefined,
      probs: result.probs,
    })
    setAddedCaseId(created.id)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* ── Context column ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-center font-display text-lg text-mvr-primary">Context</h3>
        <div className="space-y-4 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
        {/* Reservation lookup */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Reservation code
          </label>
          <div className="flex gap-2">
            <input
              className={INPUT_CLASS}
              placeholder="Paste the confirmation code…"
              value={lookupCode}
              onChange={(e) => setLookupCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleLookup()
                }
              }}
            />
            <Button onClick={handleLookup} disabled={lookupState === 'loading' || !lookupCode.trim()} variant="outline">
              {lookupState === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Search
            </Button>
          </div>
          {lookupState === 'not_found' ? (
            <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-mvr-warning-light px-2.5 py-1.5 text-xs text-mvr-warning">
              <AlertTriangle className="h-3.5 w-3.5" /> No reservation found for that code — fill the fields manually.
            </p>
          ) : null}
          {lookupState === 'error' ? (
            <p className="mt-1.5 text-xs text-mvr-danger">{lookupError}</p>
          ) : null}
        </div>

        {/* Reservation context (after a successful lookup) */}
        {reservation ? (
          <div className="space-y-2 rounded-lg border border-[#E0DBD4] bg-mvr-sand-light p-3 text-xs text-mvr-olive">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {reservation.guestName ? <div><span className="text-muted-foreground">Guest:</span> {reservation.guestName}</div> : null}
              <div className="flex items-center gap-1.5"><span className="text-muted-foreground">OTA:</span> <OtaIcon ota={reservation.ota} className="h-4 w-4" /> {reservation.ota}</div>
              {reservation.property ? <div><span className="text-muted-foreground">Building:</span> {reservation.property}</div> : null}
              {reservation.unit ? <div><span className="text-muted-foreground">Unit:</span> {reservation.unit}</div> : null}
              {fmtDateTime(reservation.checkinAt) ?? reservation.checkinDate?.slice(0, 10) ? (
                <div><span className="text-muted-foreground">Check-in:</span> {fmtDateTime(reservation.checkinAt) ?? reservation.checkinDate?.slice(0, 10)}</div>
              ) : null}
              {fmtDateTime(reservation.checkoutAt) ?? reservation.checkoutDate?.slice(0, 10) ? (
                <div><span className="text-muted-foreground">Check-out:</span> {fmtDateTime(reservation.checkoutAt) ?? reservation.checkoutDate?.slice(0, 10)}</div>
              ) : null}
              {reservation.nights != null ? <div><span className="text-muted-foreground">Nights:</span> {reservation.nights}</div> : null}
              {fmtMoney(reservation.payout) ? <div><span className="text-muted-foreground">Total payout:</span> {fmtMoney(reservation.payout)}</div> : null}
              {fmtMoney(reservation.adr) ? <div><span className="text-muted-foreground">ADR:</span> {fmtMoney(reservation.adr)}</div> : null}
            </div>
          </div>
        ) : null}

        {/* OTA is pulled from the reservation (shown in the context panel above).
            Warn when it's outside the 4 the dispute tool supports. */}
        {otaUnsupported ? (
          <p className="flex items-center gap-1.5 rounded-lg bg-mvr-warning-light px-2.5 py-1.5 text-xs text-mvr-warning">
            <AlertTriangle className="h-3.5 w-3.5" /> This booking&apos;s OTA ({reservation?.ota}) isn&apos;t one of the 4 the dispute tool supports — analysis may be limited.
          </p>
        ) : null}

        {/* Context — after a lookup: the conversation (inbox view) + the review,
            as two tabs. The case type decides which one is analyzed. With no
            reservation, fall back to a manual paste-in textarea. */}
        {reservation ? (
          <div>
            <Tabs defaultValue="conversation" className="flex w-full flex-col gap-0">
              <TabsList variant="line" className="mb-3 w-full justify-start border-b border-[#E0DBD4]">
                <TabsTrigger value="conversation" className="gap-1.5 px-3 text-sm">
                  <MessagesSquare className="h-3.5 w-3.5" /> Conversation
                </TabsTrigger>
                <TabsTrigger value="review" className="gap-1.5 px-3 text-sm">
                  <Star className="h-3.5 w-3.5" /> Review
                </TabsTrigger>
              </TabsList>

              <TabsContent value="conversation">
                <ConversationInbox
                  messages={conversation?.messages ?? []}
                  isLoading={false}
                  isError={false}
                  guestName={reservation.guestName}
                  emptyHint="No guest conversation is linked to this reservation."
                  className="min-h-[240px] max-h-[46vh] overflow-y-auto shadow-card"
                />
              </TabsContent>

              <TabsContent value="review">
                {review?.text || review?.rating != null ? (
                  <div className="space-y-3 rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
                    {review?.rating != null ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Guest rating</span>
                        <RatingDisplay rating={review.rating} />
                      </div>
                    ) : null}
                    {review?.text ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-mvr-olive">{review.text}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No review text was captured.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No review is linked to this reservation.</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Main input
            </label>
            <textarea
              className={`${INPUT_CLASS} min-h-[160px] resize-y`}
              placeholder="Paste the review, conversation, or notice to analyze…"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
          </div>
        )}

        {/* Amount + timeline — built-in OTA dispute only */}
        {showAmountTimeline && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <input className={INPUT_CLASS} placeholder="Amount in dispute (e.g. $480)" value={monto} onChange={(e) => setMonto(e.target.value)} />
            <input className={INPUT_CLASS} placeholder="Timeline / chronology" value={cronologia} onChange={(e) => setCronologia(e.target.value)} />
          </div>
        )}

        {/* Evidence */}
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence (optional)</label>
          <div className="flex flex-wrap items-center gap-2">
            {evidence.map((e) => (
              <div key={e.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.previewUrl} alt={e.name} className="h-16 w-16 rounded-lg border border-[#E0DBD4] object-cover" />
                <button type="button" onClick={() => removeEvidence(e.path)} className="absolute -right-1.5 -top-1.5 rounded-full bg-mvr-danger p-0.5 text-white shadow-card" aria-label="Remove evidence">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-mvr-steel text-mvr-steel transition-colors hover:border-mvr-primary hover:text-mvr-primary"
            >
              {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
              <span className="text-[10px]">Add</span>
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          </div>
          {uploadError ? <p className="mt-1 text-xs text-mvr-danger">{uploadError}</p> : null}
        </div>

        {/* Case type — last, just before analyzing */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Case type</label>
            <button
              type="button"
              onClick={() => setNewTypeOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-mvr-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> New type
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {caseTypes.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => selectType(t.key)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  caseType === t.key
                    ? 'border-mvr-primary bg-mvr-primary-light font-medium text-mvr-primary'
                    : 'border-[#E0DBD4] text-mvr-olive hover:bg-mvr-neutral'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {newTypeOpen ? (
            <div className="mt-2">
              <NewCaseTypeForm
                onCancel={() => setNewTypeOpen(false)}
                onCreated={(key) => {
                  setNewTypeOpen(false)
                  selectType(key)
                }}
              />
            </div>
          ) : null}
        </div>

        <Button onClick={handleAnalyze} disabled={analyze.isPending || !inputText.trim()} className="w-full" size="lg">
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyze.isPending ? 'Analyzing…' : 'Analyze case'}
        </Button>
        {analyze.isError ? <p className="text-sm text-mvr-danger">{(analyze.error as Error).message}</p> : null}
        </div>
      </div>

      {/* ── Analysis column ────────────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-center font-display text-lg text-mvr-primary">Analysis</h3>
        {result ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              {addedCaseId ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-mvr-success-light px-3 py-1 text-xs font-medium text-mvr-success">
                  <Check className="h-3.5 w-3.5" /> Added to tracker
                </span>
              ) : (
                <Button onClick={addToTracker} disabled={create.isPending || !inputText.trim()}>
                  {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add to tracker
                </Button>
              )}
            </div>
            {create.isError ? <p className="text-center text-sm text-mvr-danger">{(create.error as Error).message}</p> : null}
            <ResultView probs={result.probs} resultText={result.resultText} caseType={result.caseType} />
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#E0DBD4] bg-mvr-cream/50 p-8 text-center">
            <Search className="mb-3 h-8 w-8 text-mvr-steel" />
            <p className="text-sm text-muted-foreground">
              Paste a reservation code and hit <span className="font-medium text-mvr-primary">Search</span> to pull the
              booking, the guest conversation, and the review — then <span className="font-medium text-mvr-primary">Analyze</span>
              {' '}for win-probability metrics, a verdict, an OTA support message, an evidence checklist, and a public response.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── New custom case type form ─────────────────────────────────────────────────
interface DraftStage {
  label: string
  tone: StatusTone
  terminal: boolean
}

const TONE_OPTIONS: Array<{ value: StatusTone; label: string }> = [
  { value: 'active', label: 'In progress' },
  { value: 'steel', label: 'Info' },
  { value: 'success', label: 'Positive' },
  { value: 'danger', label: 'Negative' },
  { value: 'warning', label: 'Warning' },
  { value: 'neutral', label: 'Neutral' },
]

function stageSlug(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

function NewCaseTypeForm({
  onCreated,
  onCancel,
}: {
  onCreated: (key: string) => void
  onCancel: () => void
}) {
  const create = useCreateCaseType()
  const [label, setLabel] = useState('')
  const [stages, setStages] = useState<DraftStage[]>([
    { label: 'Open', tone: 'active', terminal: false },
    { label: 'Resolved', tone: 'success', terminal: true },
  ])
  const [defaultIndex, setDefaultIndex] = useState(0)

  function updateStage(i: number, patch: Partial<DraftStage>) {
    setStages((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }
  function addStage() {
    setStages((prev) => [...prev, { label: '', tone: 'neutral', terminal: false }])
  }
  function removeStage(i: number) {
    setStages((prev) => prev.filter((_, idx) => idx !== i))
    if (defaultIndex >= i && defaultIndex > 0) setDefaultIndex((d) => d - 1)
  }

  const namedStages = stages.filter((s) => s.label.trim())
  const canSave = label.trim().length > 0 && namedStages.length >= 1

  async function save() {
    if (!canSave) return
    const seen = new Set<string>()
    const statuses = namedStages.map((s) => {
      const base = stageSlug(s.label) || 'status'
      let key = base
      for (let n = 2; seen.has(key); n++) key = `${base}-${n}`
      seen.add(key)
      return { key, label: s.label.trim(), tone: s.tone, terminal: s.terminal }
    })
    const defLabel = stages[defaultIndex]?.label.trim()
    const defaultStatus = statuses.find((s) => s.label === defLabel)?.key ?? statuses[0].key
    const created = await create.mutateAsync({ label: label.trim(), statuses, defaultStatus })
    onCreated(created.key)
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-mvr-steel bg-mvr-cream/60 p-3">
      <input
        className={INPUT_CLASS}
        placeholder="New type name (e.g. Chargeback, Damage claim)"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
      />
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Status stages
        </p>
        {stages.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="radio"
              name="defaultStage"
              checked={defaultIndex === i}
              onChange={() => setDefaultIndex(i)}
              title="Starting status"
            />
            <input
              className={`${INPUT_CLASS} flex-1`}
              placeholder="Stage name"
              value={s.label}
              onChange={(e) => updateStage(i, { label: e.target.value })}
            />
            <select
              className={`${INPUT_CLASS} w-32 shrink-0`}
              value={s.tone}
              onChange={(e) => updateStage(i, { tone: e.target.value as StatusTone })}
            >
              {TONE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <input
                type="checkbox"
                checked={s.terminal}
                onChange={(e) => updateStage(i, { terminal: e.target.checked })}
              />
              Closes
            </label>
            {stages.length > 1 ? (
              <button
                type="button"
                onClick={() => removeStage(i)}
                className="rounded p-1 text-mvr-steel hover:text-mvr-danger"
                aria-label="Remove stage"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ))}
        <button type="button" onClick={addStage} className="text-[11px] font-medium text-mvr-primary hover:underline">
          + Add stage
        </button>
        <p className="text-[10px] text-muted-foreground">
          The selected radio is the status a new case starts in · &quot;Closes&quot; marks the case resolved.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={save} disabled={create.isPending || !canSave}>
          {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Create type
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
      {create.isError ? <p className="text-xs text-mvr-danger">{(create.error as Error).message}</p> : null}
    </div>
  )
}
