'use client'

import { Star } from 'lucide-react'
import type { CohortWeekPoint, WeeklyResponsePoint } from '@/lib/reviews/types'
import { Delta, SectionCard, fmtPct, fmtRating, rateTone } from './performanceShared'

interface Props {
  weeklyTrend:   CohortWeekPoint[]   // checkout cohort, trailing ISO weeks
  responseTrend: WeeklyResponsePoint[] // publish date, trailing ISO weeks
}

// Short week label: 'YYYY-Www' → 'Wnn'.
function weekLabel(isoWeek: string): string {
  const m = isoWeek.match(/W(\d{2})$/)
  return m ? `W${m[1]}` : isoWeek
}

export function WeeklyPulse({ weeklyTrend, responseTrend }: Props) {
  if (weeklyTrend.length === 0) {
    return (
      <SectionCard title="Weekly pulse">
        <p className="text-sm text-muted-foreground">No checkout data in range.</p>
      </SectionCard>
    )
  }

  // Headline = the most recent *complete* (non-maturing) week, compared to the
  // complete week before it. Falls back to the latest week if all are maturing.
  const complete = weeklyTrend.filter((w) => !w.maturing)
  const latest   = complete[complete.length - 1] ?? weeklyTrend[weeklyTrend.length - 1]
  const prior    = complete[complete.length - 2] ?? null

  const latestResponse = responseTrend[responseTrend.length - 1] ?? null
  const priorResponse  = responseTrend.length >= 2 ? responseTrend[responseTrend.length - 2] : null

  const maxRate = Math.max(0.01, ...weeklyTrend.map((w) => w.reviewRate ?? 0))

  const cards: Array<{
    label: string
    value: string
    delta?: React.ReactNode
    tone?: string
    starred?: boolean
  }> = [
    {
      label: 'Reviews',
      value: latest.reviews.toLocaleString(),
      delta: prior ? <Delta current={latest.reviews} previous={prior.reviews} kind="rating" /> : undefined,
    },
    {
      label: 'Review rate',
      value: fmtPct(latest.reviewRate, 1),
      tone:  rateTone(latest.reviewRate, 0.4, 0.3),
      delta: prior ? <Delta current={latest.reviewRate} previous={prior.reviewRate} kind="point" /> : undefined,
    },
    {
      label:   'Avg rating',
      value:   fmtRating(latest.avgRating),
      starred: true,
      delta:   prior ? <Delta current={latest.avgRating} previous={prior.avgRating} kind="rating" /> : undefined,
    },
    {
      label: '5 ★ rate',
      value: fmtPct(latest.fiveStarRate),
      tone:  rateTone(latest.fiveStarRate, 0.9, 0.8),
      delta: prior ? <Delta current={latest.fiveStarRate} previous={prior.fiveStarRate} kind="point" /> : undefined,
    },
    {
      label: 'Response rate',
      value: fmtPct(latestResponse?.responseRate ?? null),
      tone:  rateTone(latestResponse?.responseRate ?? null, 0.9, 0.8),
      delta:
        latestResponse && priorResponse ? (
          <Delta current={latestResponse.responseRate} previous={priorResponse.responseRate} kind="point" />
        ) : undefined,
    },
  ]

  return (
    <SectionCard
      title="Weekly pulse"
      subtitle={`Checkout cohort — of guests who checked out each week, how many reviewed. Headline = week of ${latest.weekStart} (the latest complete week). Shaded weeks are still maturing: reviews keep arriving for ~4 weeks after checkout.`}
    >
      {/* KPI cards for the latest complete week */}
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-[#E0DBD4] bg-mvr-cream p-3 shadow-card">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className={`text-2xl font-display flex items-baseline gap-1 ${c.tone ?? 'text-mvr-primary'}`}>
              {c.starred ? <Star className="w-5 h-5 fill-current self-center text-mvr-warning" /> : null}
              {c.value}
            </div>
            <div className="mt-0.5 h-4">{c.delta ?? null}</div>
          </div>
        ))}
      </div>

      {/* 8-week review-rate trend — maturing weeks dimmed/striped */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-mvr-primary">Review rate by week</span>
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-2 rounded-sm bg-mvr-primary" /> complete
            <span className="inline-block w-3 h-2 rounded-sm bg-mvr-steel/40 ml-2" /> maturing
          </span>
        </div>
        <div className="flex items-end gap-2" style={{ height: 96 }}>
          {weeklyTrend.map((w) => {
            const h = w.reviewRate != null ? Math.max(2, (w.reviewRate / maxRate) * 80) : 2
            return (
              <div key={w.isoWeek} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
                <span className="text-[10px] tabular-nums text-muted-foreground">{fmtPct(w.reviewRate)}</span>
                <div
                  className={`w-full rounded-t-sm ${w.maturing ? 'bg-mvr-steel/40' : 'bg-mvr-primary'}`}
                  style={{ height: h }}
                  title={`${w.isoWeek}: ${w.reviews}/${w.reservations} reviewed${w.maturing ? ' (still maturing)' : ''}`}
                />
                <span className={`text-[10px] tabular-nums ${w.maturing ? 'text-muted-foreground/60' : 'text-mvr-primary'}`}>
                  {weekLabel(w.isoWeek)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </SectionCard>
  )
}
