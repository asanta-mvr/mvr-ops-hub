'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useState, useTransition } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  MessageSquareOff,
  Star,
} from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import type { ReviewActionStatus, ReviewWithAction } from '@/lib/reviews/types'
import { KpiStrip, fiveStarTone, type KpiCard } from './KpiStrip'
import { ReviewActionDrawer } from './ReviewActionDrawer'

interface Props {
  rows:              ReviewWithAction[]
  totalCount:        number
  page:              number
  pageSize:          number
  /** KPI strip — omitted by the Disputes panel which owns its own strip. */
  topKpis?:          KpiCard[]
  /** Show the Performance-tab quick filter pills above the list. Disputes
   *  panel hides them since its scope is already narrow. */
  showQuickFilters?: boolean
  assigneeOptions:   Array<{ id: string; name: string }>
  onActionSaved?:    (row: ReviewWithAction) => void
  emptyLabel?:       string
}

const OTA_LABEL: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking', vrbo: 'Vrbo',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}

const OTA_ICON: Partial<Record<OtaSource, string>> = {
  airbnb:  '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  vrbo:    '/icons/ota-vrbo.png',
  expedia: '/icons/ota-expedia.png',
  other:   '/icons/ota-other.png',
}

const STATUS_STYLE: Record<ReviewActionStatus, { bg: string; label: string }> = {
  new:              { bg: 'bg-mvr-neutral text-mvr-primary',       label: 'New' },
  under_review:     { bg: 'bg-mvr-steel-light text-mvr-primary',   label: 'Under review' },
  no_action:        { bg: 'bg-mvr-sand-light text-mvr-olive',      label: 'No action' },
  disputing:        { bg: 'bg-mvr-warning-light text-mvr-warning', label: 'Disputing' },
  dispute_won:      { bg: 'bg-mvr-success-light text-mvr-success', label: 'Won' },
  dispute_lost:     { bg: 'bg-mvr-danger-light text-mvr-danger',   label: 'Lost' },
  closed_no_change: { bg: 'bg-mvr-neutral text-mvr-olive',         label: 'Closed' },
}

function disputeProbTone(score: number | null): { bg: string; label: string } | null {
  if (score == null) return null
  if (score >= 0.7)  return { bg: 'bg-mvr-success-light text-mvr-success', label: `${Math.round(score * 100)}%` }
  if (score >= 0.4)  return { bg: 'bg-mvr-warning-light text-mvr-warning', label: `${Math.round(score * 100)}%` }
  return { bg: 'bg-mvr-neutral text-muted-foreground', label: `${Math.round(score * 100)}%` }
}

function ratingTone(rating: number | null): string {
  if (rating == null) return 'text-muted-foreground'
  if (rating <= 2)    return 'text-mvr-danger'
  if (rating === 3)   return 'text-mvr-warning'
  return 'text-mvr-success'
}

function StarsCompact({ rating }: { rating: number | null }) {
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${ratingTone(rating)}`}>
      <Star className="w-3.5 h-3.5 fill-current" />
      {rating ?? '—'}
    </span>
  )
}

export function PerformanceList({
  rows,
  totalCount,
  page,
  pageSize,
  topKpis,
  showQuickFilters = false,
  assigneeOptions,
  onActionSaved,
  emptyLabel = 'No reviews match the current filters.',
}: Props) {
  const router    = useRouter()
  const pathname  = usePathname()
  const [, startTransition] = useTransition()
  const [drawerRow, setDrawerRow] = useState<ReviewWithAction | null>(null)

  function setPage(next: number) {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
    if (next <= 0) params.delete('page')
    else params.set('page', String(next))
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  const firstShown = totalCount === 0 ? 0 : page * pageSize + 1
  const lastShown  = Math.min((page + 1) * pageSize, totalCount)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  return (
    <div className="space-y-3">
      {topKpis ? <KpiStrip cards={topKpis} /> : null}

      {showQuickFilters ? <PerformanceQuickFilters /> : null}

      {rows.length === 0 ? (
        <div className="bg-white border border-[#E0DBD4] rounded-xl p-10 text-center shadow-card">
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const status  = r.action?.status ?? 'new'
            const icon    = OTA_ICON[r.otaSource]
            const prob    = disputeProbTone(r.action?.disputeScore ?? null)
            const hasTags = r.positiveTags.length > 0 || r.negativeTags.length > 0
            return (
              <li
                key={r.id}
                className="bg-white border border-[#E0DBD4] rounded-lg px-3 py-2 shadow-card"
              >
                {/* Row 1 (optional): tags at the top to save vertical space. */}
                {hasTags ? (
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {r.positiveTags.map((t) => (
                      <span key={`p-${t}`} className="bg-mvr-success-light text-mvr-success rounded-full px-1.5 py-px text-[10px]">
                        + {t}
                      </span>
                    ))}
                    {r.negativeTags.map((t) => (
                      <span key={`n-${t}`} className="bg-mvr-danger-light text-mvr-danger rounded-full px-1.5 py-px text-[10px]">
                        − {t}
                      </span>
                    ))}
                  </div>
                ) : null}

                {/* Row 2: identity (rating, unit, guest, channel, date) + status / dispute prob / action. */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <StarsCompact rating={r.rating} />
                    <span className="text-mvr-primary font-semibold truncate">{r.unitName ?? '—'}</span>
                    {r.guestName ? (
                      <span className="text-mvr-olive truncate">· {r.guestName}</span>
                    ) : null}
                    {icon ? (
                      <Image src={icon} alt={OTA_LABEL[r.otaSource]} width={14} height={14} className="object-contain rounded" />
                    ) : null}
                    <span className="text-xs text-muted-foreground">{OTA_LABEL[r.otaSource]}</span>
                    <span className="text-xs text-muted-foreground">· {r.date}</span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {prob ? (
                      <span
                        title={r.action?.aiRecommendation ?? 'AI score (Phase 3)'}
                        className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold ${prob.bg}`}
                      >
                        Dispute {prob.label}
                      </span>
                    ) : null}
                    <span className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-medium ${STATUS_STYLE[status].bg}`}>
                      {STATUS_STYLE[status].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDrawerRow(r)}
                      className="inline-flex items-center rounded-md border border-[#E0DBD4] px-2 py-px text-[11px] font-medium text-mvr-primary hover:bg-mvr-cream"
                    >
                      Action
                    </button>
                  </div>
                </div>

                {/* Row 3: comment (one line, truncated) + replied indicator on the right. */}
                <div className="flex items-center justify-between gap-3 mt-1">
                  <p className="text-sm text-mvr-olive truncate flex-1 min-w-0" title={r.description ?? ''}>
                    {r.description ?? <span className="italic text-muted-foreground">No review body.</span>}
                  </p>
                  {r.hostResponded ? (
                    <span
                      title={r.hostResponseText ?? 'Host replied'}
                      className="text-[11px] text-mvr-success inline-flex items-center gap-1 whitespace-nowrap"
                    >
                      <MessageSquare className="w-3 h-3" /> Replied
                    </span>
                  ) : (
                    <span className="text-[11px] text-mvr-danger inline-flex items-center gap-1 whitespace-nowrap">
                      <MessageSquareOff className="w-3 h-3" /> Not replied
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {totalCount === 0
            ? '0 reviews'
            : `Showing ${firstShown.toLocaleString()}–${lastShown.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" /> Prev
          </button>
          <span className="tabular-nums">Page {page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page + 1 >= totalPages}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {drawerRow ? (
        <ReviewActionDrawer
          review={drawerRow}
          assigneeOptions={assigneeOptions}
          onClose={() => setDrawerRow(null)}
          onSaved={(merged) => {
            onActionSaved?.(merged)
            setDrawerRow(null)
          }}
        />
      ) : null}
    </div>
  )
}

// ── Quick filter pills (Performance tab only) ──────────────────────────────
//
// Single-select shortcuts that write to the same URL params as the global
// filter bar's multi-select dropdowns. Clicking "5 ★" replaces whatever was
// in `?stars=…`; clicking "All" clears it. Multi-select state (e.g. user
// picked 4+5 via the dropdown) shows no specific pill highlighted.

const OTA_ORDER: ReadonlyArray<OtaSource> = ['airbnb', 'booking', 'expedia', 'vrbo', 'vacasa', 'other']
const STAR_VALUES = ['5', '4', '3', '2', '1'] as const

function PerformanceQuickFilters() {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const stars = (searchParams.get('stars') ?? '').split(',').filter(Boolean)
  const otas  = (searchParams.get('ota')   ?? '').split(',').filter(Boolean)

  const activeStar = stars.length === 1 ? stars[0] : null
  const activeOta  = otas.length  === 1 ? otas[0]  : null

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value == null) params.delete(key)
    else params.set(key, value)
    params.delete('page')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname))
  }

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-2 shadow-card flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground px-1">Stars:</span>
      <PillRow
        active={activeStar}
        all={stars.length === 0}
        onSelect={(v) => setParam('stars', v)}
        items={STAR_VALUES.map((s) => ({ value: s, label: `${s} ★` }))}
      />

      <span className="h-5 w-px bg-[#E0DBD4]" aria-hidden />

      <span className="text-xs text-muted-foreground px-1">Channels:</span>
      <PillRow
        active={activeOta}
        all={otas.length === 0}
        onSelect={(v) => setParam('ota', v)}
        items={OTA_ORDER.map((o) => ({ value: o, label: OTA_LABEL[o] }))}
      />
    </div>
  )
}

interface PillRowProps {
  active:   string | null
  all:      boolean
  onSelect: (value: string | null) => void
  items:    Array<{ value: string; label: string }>
}

function PillRow({ active, all, onSelect, items }: PillRowProps) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1">
      <Pill active={all} onClick={() => onSelect(null)} label="All" />
      {items.map((p) => (
        <Pill
          key={p.value}
          active={active === p.value}
          onClick={() => onSelect(p.value)}
          label={p.label}
        />
      ))}
    </div>
  )
}

function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'bg-mvr-primary text-white border-mvr-primary'
          : 'bg-mvr-cream text-mvr-primary border-[#E0DBD4] hover:bg-mvr-neutral',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

// Helper available for callers (Performance tab) to build their KPI strip.
export function buildPerformanceKpis(
  totalCount: number,
  avgRating: number | null,
  responseRate: number | null
): KpiCard[] {
  const fmtPct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1)}%`)
  return [
    { label: 'Reviews', value: totalCount.toLocaleString() },
    {
      label:   'Avg rating',
      value:   avgRating != null ? avgRating.toFixed(2) : '—',
      starred: true,
    },
    {
      label: 'Reply rate',
      value: fmtPct(responseRate),
      tone:  fiveStarTone(responseRate),
    },
  ]
}
