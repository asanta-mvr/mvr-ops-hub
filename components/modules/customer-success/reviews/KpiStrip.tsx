'use client'

import { Star } from 'lucide-react'

export interface KpiCard {
  label: string
  value: string
  /** Optional sub-label rendered below the value, e.g. "target ≥ 90%". */
  hint?: string
  /** Visual tone — drives the accent color. */
  tone?: 'default' | 'success' | 'warning' | 'danger'
  /** Show star next to the value (used by Avg Rating). */
  starred?: boolean
}

interface Props {
  cards: KpiCard[]
}

// Threshold helper exported so the page can color-code the 5★ card by target.
export function fiveStarTone(rate: number | null): KpiCard['tone'] {
  if (rate == null) return 'default'
  if (rate >= 0.9) return 'success'
  if (rate >= 0.8) return 'warning'
  return 'danger'
}

const TONE_BG: Record<NonNullable<KpiCard['tone']>, string> = {
  default: 'bg-mvr-cream',
  success: 'bg-mvr-success-light',
  warning: 'bg-mvr-warning-light',
  danger:  'bg-mvr-danger-light',
}
const TONE_TEXT: Record<NonNullable<KpiCard['tone']>, string> = {
  default: 'text-mvr-primary',
  success: 'text-mvr-success',
  warning: 'text-mvr-warning',
  danger:  'text-mvr-danger',
}

export function KpiStrip({ cards }: Props) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${cards.length}, minmax(0, 1fr))` }}
    >
      {cards.map((c) => {
        const tone = c.tone ?? 'default'
        return (
          <div
            key={c.label}
            className={`rounded-xl border border-[#E0DBD4] p-3 shadow-card ${TONE_BG[tone]}`}
          >
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-display flex items-baseline gap-1 ${TONE_TEXT[tone]}`}>
              {c.starred ? <Star className="w-5 h-5 fill-current self-center" /> : null}
              {c.value}
            </div>
            {c.hint ? <div className="text-xs text-muted-foreground mt-0.5">{c.hint}</div> : null}
          </div>
        )
      })}
    </div>
  )
}
