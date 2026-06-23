'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, ImagePlus, Loader2, MessagesSquare, Search, Sparkles, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DISPUTE_OTAS,
  type AnalyzeResult,
  type DisputeCaseTypeT,
  type DisputeOta,
  type ReservationMeta,
} from '@/lib/disputes/types'
import {
  lookupReservationByCode,
  useAnalyze,
  uploadEvidence,
  type ReservationLookupResult,
} from './useDisputeQueries'
import { ResultView } from './ResultView'
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

export function AnalyzeTab() {
  const analyze = useAnalyze()
  const [draftId] = useState(newDraftId)

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

  const isDispute = caseType === 'disputa'

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

  async function handleAnalyze() {
    if (!inputText.trim()) return
    const res = await analyze.mutateAsync({
      caseType,
      ota,
      inputText,
      guestName: guestName || undefined,
      reservationRef: reservationRef || undefined,
      monto: isDispute ? monto || undefined : undefined,
      cronologia: isDispute ? cronologia || undefined : undefined,
      evidencePaths: evidence.map((e) => e.path),
      reservationMeta: buildReservationMeta(),
    })
    setResult({ probs: res.probs, resultText: res.resultText, caseType })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {/* ── Input column ───────────────────────────────────────────────── */}
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

        {/* Main text */}
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isDispute ? 'Support chat / dispute notice (main input)' : 'Review text (main input)'}
            </label>
            {reservation ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {conversation ? (
                  <button type="button" onClick={() => setInputText(conversation.transcript)} className="inline-flex items-center gap-1 rounded-full border border-mvr-primary/30 bg-white px-2.5 py-1 text-[11px] text-mvr-primary hover:bg-mvr-primary-light">
                    <MessagesSquare className="h-3.5 w-3.5" /> Use conversation ({conversation.messageCount})
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No conversation</span>
                )}
                {review?.text ? (
                  <button type="button" onClick={() => setInputText(review.text ?? '')} className="inline-flex items-center gap-1 rounded-full border border-mvr-primary/30 bg-white px-2.5 py-1 text-[11px] text-mvr-primary hover:bg-mvr-primary-light">
                    <Star className="h-3.5 w-3.5" /> Use review{typeof review.rating === 'number' ? ` (${review.rating}★)` : ''}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No review left</span>
                )}
              </div>
            ) : null}
          </div>
          <textarea
            className={`${INPUT_CLASS} min-h-[160px] resize-y`}
            placeholder={isDispute ? 'Guest conversation / dispute text — pulled from the booking, or paste manually…' : 'Review text — pulled from the booking, or paste manually…'}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </div>

        {/* Dispute-only fields */}
        {isDispute && (
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
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Case type</label>
          <div className="grid grid-cols-2 gap-2">
            {([
              { v: 'review', label: 'Review removal' },
              { v: 'disputa', label: 'OTA dispute' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setCaseType(opt.v)}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  caseType === opt.v
                    ? 'border-mvr-primary bg-mvr-primary-light font-medium text-mvr-primary'
                    : 'border-[#E0DBD4] text-mvr-olive hover:bg-mvr-neutral'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleAnalyze} disabled={analyze.isPending || !inputText.trim()} className="w-full" size="lg">
          {analyze.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyze.isPending ? 'Analyzing…' : 'Analyze case'}
        </Button>
        {analyze.isError ? <p className="text-sm text-mvr-danger">{(analyze.error as Error).message}</p> : null}
      </div>

      {/* ── Result column ──────────────────────────────────────────────── */}
      <div>
        {result ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg text-mvr-primary">Analysis</h3>
              <span className="rounded-full bg-mvr-success-light px-2.5 py-0.5 text-xs text-mvr-success">Saved to tracker</span>
            </div>
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
