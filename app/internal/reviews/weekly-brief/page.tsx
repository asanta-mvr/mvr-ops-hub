import { notFound } from 'next/navigation'
import type { OtaSource } from '@prisma/client'
import { Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import { buildWeeklyBrief } from '@/lib/reviews/weekly-brief'
import type { ReviewRow } from '@/lib/reviews/types'

// Token-gated, hidden from the sidebar. Rendered server-side and then
// captured by puppeteer in /api/v1/reviews/weekly-brief to produce the PDF.
// Visiting it in a browser with the token is also a valid way to preview.

export const dynamic    = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: { token?: string }
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
const OTA_DISPLAY_ORDER: OtaSource[] = ['airbnb', 'booking', 'expedia', 'vrbo', 'vacasa', 'other']
function otaSortIndex(o: OtaSource): number {
  const i = OTA_DISPLAY_ORDER.indexOf(o)
  return i === -1 ? OTA_DISPLAY_ORDER.length : i
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}
function fmtDateRange(from: string, to: string): string {
  const [, mFrom, dFrom] = from.split('-')
  const [yTo, mTo, dTo]  = to.split('-')
  const monthName = (m: string) => new Date(Date.UTC(Number(yTo), Number(m) - 1, 1))
    .toLocaleDateString('en-US', { month: 'short' })
  if (mFrom === mTo) {
    return `${monthName(mFrom)} ${Number(dFrom)} – ${Number(dTo)}, ${yTo}`
  }
  return `${monthName(mFrom)} ${Number(dFrom)} – ${monthName(mTo)} ${Number(dTo)}, ${yTo}`
}

// ── Delta helpers ─────────────────────────────────────────────────────────

interface Delta {
  /** Decimal change, e.g. 0.05 for +5%. Null when prior was 0 or value was null. */
  pct:        number | null
  /** Raw difference current - prior. */
  raw:        number | null
  direction:  'up' | 'down' | 'flat'
}
function delta(current: number | null, prior: number | null): Delta {
  if (current == null || prior == null) {
    return { pct: null, raw: null, direction: 'flat' }
  }
  const raw = current - prior
  const dir: Delta['direction'] = raw > 1e-6 ? 'up' : raw < -1e-6 ? 'down' : 'flat'
  if (prior === 0) {
    return { pct: null, raw, direction: dir }
  }
  return { pct: raw / prior, raw, direction: dir }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function WeeklyBriefPreview({ searchParams }: PageProps) {
  const expected = process.env.WEEKLY_BRIEF_TOKEN
  if (!expected || !searchParams.token || searchParams.token !== expected) {
    notFound()
  }

  const brief = await buildWeeklyBrief(new Date())
  const { scope, priorScope, current, prior, disputeStats, latestGood, latestBad, topTagsPos, topTagsNeg } = brief

  return (
    <main className="min-h-screen bg-white text-mvr-olive print:bg-white">
      <style>{`
        @page { size: letter; margin: 0.5in; }
        @media print {
          body { background: #ffffff !important; }
          section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="max-w-[850px] mx-auto px-6 py-6 space-y-6">
        {/* ── Letterhead ──────────────────────────────────────────────── */}
        <header className="border-b border-[#E0DBD4] pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-sand">
                MVR · Customer Success
              </p>
              <h1 className="font-display text-3xl text-mvr-primary leading-tight mt-1">
                Reviews — Weekly Brief
              </h1>
              <p className="text-sm text-mvr-olive mt-1">
                Week of <span className="font-semibold">{fmtDateRange(scope.dateFrom, scope.dateTo)}</span>
                {' '}<span className="text-muted-foreground text-xs">vs. {fmtDateRange(priorScope.dateFrom, priorScope.dateTo)}</span>
              </p>
            </div>
            <div className="text-right text-[11px] text-muted-foreground">
              <p>Generated {new Date(brief.generatedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              {current.etlLoadedAt ? (
                <p>ETL sync {new Date(current.etlLoadedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {scope.buildings.map((b) => (
              <span key={b} className="inline-flex items-center px-2 py-0.5 rounded-full bg-mvr-cream border border-[#E0DBD4] text-[11px] text-mvr-primary font-medium">
                {b}
              </span>
            ))}
          </div>
        </header>

        {/* ── KPI strip ───────────────────────────────────────────────── */}
        <section>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
            This week at a glance
          </p>
          <div className="grid grid-cols-5 gap-3">
            <KpiCard
              label="Total reviews"
              value={current.totalReviews.toLocaleString()}
              delta={delta(current.totalReviews, prior.totalReviews)}
              polarity="neutral"
            />
            <KpiCard
              label="Avg rating"
              value={current.avgRating == null ? '—' : current.avgRating.toFixed(2)}
              suffix="★"
              delta={delta(current.avgRating, prior.avgRating)}
              polarity="up-is-good"
            />
            <KpiCard
              label="5★ rate"
              value={current.fiveStarRate == null ? '—' : `${(current.fiveStarRate * 100).toFixed(0)}%`}
              delta={delta(current.fiveStarRate, prior.fiveStarRate)}
              polarity="up-is-good"
              renderDeltaAsPpt
            />
            <KpiCard
              label="Response rate"
              value={current.responseRate == null ? '—' : `${(current.responseRate * 100).toFixed(0)}%`}
              delta={delta(current.responseRate, prior.responseRate)}
              polarity="up-is-good"
              renderDeltaAsPpt
            />
            <KpiCard
              label="Disputing now"
              value={disputeStats.disputingNow.toLocaleString()}
              hint={disputeStats.winRate == null ? undefined : `${(disputeStats.winRate * 100).toFixed(0)}% YTD win`}
              polarity="neutral"
            />
          </div>
        </section>

        {/* ── Average rating by channel ───────────────────────────────── */}
        {current.byOta.length > 0 ? (
          <section>
            <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
              Average rating by channel
            </p>
            <div className="flex flex-wrap items-start justify-around gap-4 px-3 py-2">
              {[...current.byOta]
                .sort((a, b) => otaSortIndex(a.otaSource) - otaSortIndex(b.otaSource))
                .map((o) => {
                  const iconSrc = OTA_ICON[o.otaSource]
                  return (
                    <div key={o.otaSource} className="flex flex-col items-center min-w-[88px]">
                      <p className="text-mvr-primary font-semibold text-3xl tabular-nums leading-none">
                        {o.avgRating == null ? '—' : o.avgRating.toFixed(1)}
                      </p>
                      <div className="h-7 mt-2 flex items-center justify-center">
                        {iconSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={iconSrc} alt={OTA_LABEL[o.otaSource]} className="h-6 max-w-[88px] object-contain" />
                        ) : (
                          <span className="text-mvr-primary font-medium text-xs">{OTA_LABEL[o.otaSource]}</span>
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

        {/* ── By building + top tags side by side ─────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <section className="bg-mvr-cream/40 border border-[#E0DBD4] rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
              By building
            </p>
            {current.byBuilding.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No reviews this week.</p>
            ) : (
              <BuildingTable rows={current.byBuilding} />
            )}
          </section>

          <section className="bg-mvr-cream/40 border border-[#E0DBD4] rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
              Top tags this week
            </p>
            <div className="space-y-2">
              <TagBlock label="Positive" tags={topTagsPos} tone="success" />
              <TagBlock label="Negative" tags={topTagsNeg} tone="danger" />
            </div>
          </section>
        </div>

        {/* ── Latest good + latest bad ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <ReviewBlock
            title="Latest good (≥ 4 ★)"
            icon={<ThumbsUp className="w-4 h-4 text-mvr-success" />}
            accent="border-mvr-success-light"
            rows={latestGood}
            emptyLabel="No good reviews this week."
          />
          <ReviewBlock
            title="Latest bad (≤ 3 ★)"
            icon={<ThumbsDown className="w-4 h-4 text-mvr-danger" />}
            accent="border-mvr-danger-light"
            rows={latestBad}
            emptyLabel="No bad reviews — nice work."
          />
        </div>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t border-[#E0DBD4] pt-3 text-[10px] text-muted-foreground flex justify-between">
          <span>Live dashboard: /customer-success/reviews</span>
          <span>MVR — Stay Iconic</span>
        </footer>
      </div>
    </main>
  )
}

// ── Subcomponents (server-side only — no client interactivity) ────────────

interface KpiCardProps {
  label:             string
  value:             string
  suffix?:           string
  delta?:            Delta
  hint?:             string
  polarity:          'up-is-good' | 'down-is-good' | 'neutral'
  /** When true, render the delta as a percentage-points difference (raw),
   *  not a relative change. Useful for rate metrics already in %. */
  renderDeltaAsPpt?: boolean
}
function KpiCard({ label, value, suffix, delta: d, hint, polarity, renderDeltaAsPpt = false }: KpiCardProps) {
  const tone = (() => {
    if (!d || d.direction === 'flat' || polarity === 'neutral') return 'text-muted-foreground'
    if (polarity === 'up-is-good') return d.direction === 'up' ? 'text-mvr-success' : 'text-mvr-danger'
    return d.direction === 'down' ? 'text-mvr-success' : 'text-mvr-danger'
  })()
  const arrow = d?.direction === 'up' ? '▲' : d?.direction === 'down' ? '▼' : '—'
  const deltaText = (() => {
    if (!d || d.raw == null) return null
    if (renderDeltaAsPpt) {
      const pp = d.raw * 100
      return `${pp > 0 ? '+' : ''}${pp.toFixed(0)} pp`
    }
    if (d.pct == null) {
      return `${d.raw > 0 ? '+' : ''}${d.raw.toLocaleString()}`
    }
    const pct = d.pct * 100
    return `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`
  })()
  return (
    <div className="rounded-lg border border-[#E0DBD4] bg-white px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-mvr-primary font-semibold text-2xl tabular-nums leading-tight mt-0.5">
        {value}
        {suffix ? <span className="text-base text-mvr-warning ml-0.5">{suffix}</span> : null}
      </p>
      {deltaText ? (
        <p className={`text-[11px] font-medium tabular-nums mt-1 ${tone}`}>
          {arrow} {deltaText}
          {hint ? <span className="text-muted-foreground font-normal"> · {hint}</span> : null}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      ) : null}
    </div>
  )
}

interface BuildingRow {
  buildingPrefix: string
  count:          number
  avgRating:      number | null
}
function BuildingTable({ rows }: { rows: BuildingRow[] }) {
  const maxCount = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="space-y-1.5">
      {[...rows]
        .sort((a, b) => b.count - a.count)
        .map((r) => {
          const pct = (r.count / maxCount) * 100
          return (
            <div key={r.buildingPrefix} className="flex items-center gap-2 text-xs">
              <span className="w-16 shrink-0 text-mvr-primary font-medium truncate">{r.buildingPrefix}</span>
              <div className="flex-1 h-2 bg-mvr-neutral rounded-full overflow-hidden">
                <div className="h-full bg-mvr-primary" style={{ width: `${pct.toFixed(1)}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right tabular-nums text-mvr-primary">{r.count}</span>
              <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground inline-flex items-center justify-end gap-0.5">
                {r.avgRating == null ? '—' : r.avgRating.toFixed(2)}
                <Star className="w-3 h-3 fill-current text-mvr-warning" />
              </span>
            </div>
          )
        })}
    </div>
  )
}

interface TagBlockProps {
  label: string
  tags:  Array<{ tag: string; count: number }>
  tone:  'success' | 'danger'
}
function TagBlock({ label, tags, tone }: TagBlockProps) {
  if (tags.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-xs text-muted-foreground italic">No tags.</p>
      </div>
    )
  }
  const chipClass = tone === 'success'
    ? 'bg-mvr-success-light text-mvr-success'
    : 'bg-mvr-danger-light text-mvr-danger'
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t.tag} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${chipClass}`}>
            {t.tag}
            <span className="opacity-70 tabular-nums">{t.count}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

interface ReviewBlockProps {
  title:      string
  icon:       React.ReactNode
  accent:     string
  rows:       ReviewRow[]
  emptyLabel: string
}
function ReviewBlock({ title, icon, accent, rows, emptyLabel }: ReviewBlockProps) {
  return (
    <section className={`bg-white border-2 ${accent} rounded-lg`}>
      <header className="flex items-center gap-2 px-3 py-1.5 border-b border-[#E0DBD4]">
        {icon}
        <h3 className="text-xs font-semibold text-mvr-primary">{title}</h3>
      </header>
      {rows.length === 0 ? (
        <p className="px-3 py-3 text-xs text-muted-foreground italic">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-[#E0DBD4]">
          {rows.map((r) => (
            <li key={r.id} className="px-3 py-2 text-xs">
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-mvr-primary font-medium truncate">
                  {r.unitName ?? '—'}
                  {r.guestName ? <span className="text-mvr-olive font-normal"> · {r.guestName}</span> : null}
                </span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {fmtDate(r.date)} · {OTA_LABEL[r.otaSource]}
                  {r.rating != null ? <> · <span className="text-mvr-warning font-semibold">{r.rating}★</span></> : null}
                </span>
              </div>
              <p className="text-mvr-olive leading-snug whitespace-pre-wrap">
                {r.description?.trim() ? r.description : <span className="italic text-muted-foreground">No comment.</span>}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
