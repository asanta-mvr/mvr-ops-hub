'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { OtaSource } from '@prisma/client'

// Shared formatting + micro-components for the Performance tab sections
// (WeeklyPulse, SegmentPerformance, EmergingStrengths, PainPoints). Kept in
// one place so the four sections stay visually consistent with each other and
// with the rest of the Reviews module (mvr-* tokens, font-display numbers).

export function fmtPct(v: number | null | undefined, digits = 0): string {
  if (v == null) return '—'
  return `${(v * 100).toFixed(digits)}%`
}
export function fmtRating(v: number | null | undefined): string {
  return v == null ? '—' : v.toFixed(2)
}

// Channel labels + icons — same assets the Overview ChannelBreakdown uses.
export const OTA_LABEL: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Direct / Other',
}
export const OTA_ICON: Partial<Record<OtaSource, string>> = {
  airbnb:  '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  vrbo:    '/icons/ota-vrbo.png',
  expedia: '/icons/ota-expedia.png',
  other:   '/icons/ota-other.png',
}

/** Reverse-map a display label (channel segment key) back to its OtaSource so
 *  the segment table can show the right icon. Buildings just return null. */
export function otaFromLabel(label: string): OtaSource | null {
  const hit = (Object.entries(OTA_LABEL) as Array<[OtaSource, string]>).find(([, l]) => l === label)
  return hit ? hit[0] : null
}

/** Card shell matching the rest of the module. */
export function SectionCard({
  title,
  subtitle,
  right,
  children,
}: {
  title:     string
  subtitle?: string
  right?:    React.ReactNode
  children:  React.ReactNode
}) {
  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-mvr-primary">{title}</h3>
          {subtitle ? <p className="text-xs text-muted-foreground mt-0.5 max-w-prose">{subtitle}</p> : null}
        </div>
        {right ? <div className="flex-shrink-0">{right}</div> : null}
      </div>
      {children}
    </div>
  )
}

/**
 * Trend delta vs a prior period. `kind` controls formatting:
 *  - 'point'  → percentage points (e.g. "+4.2pt"), for rates
 *  - 'rating' → absolute (e.g. "+0.12"), for star averages
 * Higher is better for both, so up = success, down = danger.
 */
export function Delta({
  current,
  previous,
  kind,
}: {
  current:  number | null
  previous: number | null
  kind:     'point' | 'rating'
}) {
  if (current == null || previous == null) {
    return <span className="text-[11px] text-muted-foreground/60">—</span>
  }
  const diff = current - previous
  const eps  = kind === 'point' ? 0.005 : 0.01 // ignore sub-0.5pt / sub-0.01★ noise
  const flat = Math.abs(diff) < eps
  const text =
    kind === 'point'
      ? `${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}pt`
      : `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}`
  const tone = flat ? 'text-muted-foreground' : diff > 0 ? 'text-mvr-success' : 'text-mvr-danger'
  const Icon = flat ? ArrowRight : diff > 0 ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${tone}`}>
      <Icon className="w-3 h-3" />
      {text}
    </span>
  )
}

/** Tone for a 5★ / review-rate style metric against soft thresholds. */
export function rateTone(v: number | null, good: number, ok: number): string {
  if (v == null) return 'text-mvr-primary'
  if (v >= good) return 'text-mvr-success'
  if (v >= ok)   return 'text-mvr-warning'
  return 'text-mvr-danger'
}
