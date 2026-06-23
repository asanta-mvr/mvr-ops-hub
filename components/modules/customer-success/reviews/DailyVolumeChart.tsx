'use client'

import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { OtaSource } from '@prisma/client'
import type { DailyVolumePoint } from '@/lib/reviews/types'

interface Props {
  data: DailyVolumePoint[]
}

type Unit   = 'day' | 'week' | 'month' | 'year'
type Metric = 'count' | 'rating'

const UNIT_LABEL: Record<Unit, string> = {
  day:   'Day',
  week:  'Week',
  month: 'Month',
  year:  'Year',
}

const METRIC_LABEL: Record<Metric, string> = {
  count:  'Reviews',
  rating: 'Rating',
}

// Channels rendered as separate lines in Rating mode + the legend below.
// Display order: Overall (rendered separately, always first) → Airbnb →
// Booking → Expedia → Vrbo → Vacasa → Other.
const CHANNELS: Array<{ key: OtaSource; label: string; color: string }> = [
  { key: 'airbnb',  label: 'Airbnb',  color: '#FF5A5F' },
  { key: 'booking', label: 'Booking', color: '#003580' },
  { key: 'expedia', label: 'Expedia', color: '#7A5B00' },
  { key: 'vrbo',    label: 'Vrbo',    color: '#245ABF' },
  { key: 'vacasa',  label: 'Vacasa',  color: '#2D6A4F' },
  { key: 'other',   label: 'Other',   color: '#6B7280' },
]

// Tooltip ordering — pinned regardless of how Recharts walks the payload.
// `overallRating` sits at priority 0 so it always renders first.
const TOOLTIP_ORDER: Record<string, number> = {
  overallRating:  0,
  rating_airbnb:  1,
  rating_booking: 2,
  rating_expedia: 3,
  rating_vrbo:    4,
  rating_vacasa:  5,
  rating_other:   6,
}

interface FlatBucket {
  label:         string
  totalCount:    number
  overallRating: number | null
  // Each channel gets two columns: rating (for the line) + count (for the tooltip).
  rating_airbnb:   number | null
  rating_booking:  number | null
  rating_vrbo:     number | null
  rating_expedia:  number | null
  rating_vacasa:   number | null
  rating_other:    number | null
  count_airbnb:    number
  count_booking:   number
  count_vrbo:      number
  count_expedia:   number
  count_vacasa:    number
  count_other:     number
}

function isoWeekBucket(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function bucketKeyForDate(unit: Unit, isoDate: string): string {
  if (unit === 'day') return isoDate
  const dt = new Date(`${isoDate}T00:00:00Z`)
  if (unit === 'week') return isoWeekBucket(dt)
  if (unit === 'year') return String(dt.getUTCFullYear())
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
}

interface WeightedAvg {
  ratingSum:   number
  ratingDenom: number
  count:       number
}

function emptyAvg(): WeightedAvg {
  return { ratingSum: 0, ratingDenom: 0, count: 0 }
}

function addAvg(slot: WeightedAvg, count: number, avg: number | null): void {
  slot.count += count
  if (avg != null) {
    slot.ratingSum   += avg * count
    slot.ratingDenom += count
  }
}

function finalize(slot: WeightedAvg): number | null {
  return slot.ratingDenom > 0 ? slot.ratingSum / slot.ratingDenom : null
}

function aggregate(data: DailyVolumePoint[], unit: Unit): FlatBucket[] {
  const buckets = new Map<string, {
    overall:  WeightedAvg
    byChan:   Map<OtaSource, WeightedAvg>
  }>()

  for (const p of data) {
    const key  = bucketKeyForDate(unit, p.date)
    const slot = buckets.get(key) ?? { overall: emptyAvg(), byChan: new Map<OtaSource, WeightedAvg>() }
    addAvg(slot.overall, p.count, p.avgRating)
    const chanSlot = slot.byChan.get(p.channel) ?? emptyAvg()
    addAvg(chanSlot, p.count, p.avgRating)
    slot.byChan.set(p.channel, chanSlot)
    buckets.set(key, slot)
  }

  return Array.from(buckets.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([label, s]) => {
      const out: FlatBucket = {
        label,
        totalCount:    s.overall.count,
        overallRating: finalize(s.overall),
        rating_airbnb:  null, rating_booking: null, rating_vrbo:   null,
        rating_expedia: null, rating_vacasa:  null, rating_other:  null,
        count_airbnb:    0,   count_booking:    0,   count_vrbo:     0,
        count_expedia:   0,   count_vacasa:     0,   count_other:    0,
      }
      const outAny = out as unknown as Record<string, number | string | null>
      for (const [ota, slot] of Array.from(s.byChan.entries())) {
        outAny[`rating_${ota}`] = finalize(slot)
        outAny[`count_${ota}`]  = slot.count
      }
      return out
    })
}

const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatTick(label: string, unit: Unit): string {
  if (unit === 'day') {
    const parts = label.split('-')
    return parts.length === 3 ? `${parts[1]}-${parts[2]}` : label
  }
  if (unit === 'week') {
    const match = label.match(/^(\d{4})-W(\d{2})$/)
    return match ? `W${match[2]} ’${match[1].slice(2)}` : label
  }
  if (unit === 'year') {
    return label
  }
  const [y, m] = label.split('-')
  const idx = Number(m) - 1
  return `${SHORT_MONTH[idx] ?? m} ’${y.slice(2)}`
}

export function DailyVolumeChart({ data }: Props) {
  const [unit, setUnit]     = useState<Unit>('week')
  const [metric, setMetric] = useState<Metric>('rating')

  const buckets = useMemo(() => aggregate(data, unit), [data, unit])

  // Which channel series have at least one data point in the current scope —
  // drives both the Legend and which <Line> components we mount.
  const activeChannels = useMemo(() => {
    const present = new Set<OtaSource>()
    for (const b of buckets) {
      for (const c of CHANNELS) {
        const key = `rating_${c.key}` as keyof FlatBucket
        if (b[key] != null) present.add(c.key)
      }
    }
    return CHANNELS.filter((c) => present.has(c.key))
  }, [buckets])

  const { avg, hasData } = useMemo(() => {
    if (buckets.length === 0) return { avg: 0, hasData: false }
    if (metric === 'count') {
      const total = buckets.reduce((s, b) => s + b.totalCount, 0)
      return { avg: total / buckets.length, hasData: true }
    }
    let num = 0, denom = 0
    for (const b of buckets) {
      if (b.overallRating == null) continue
      num   += b.overallRating * b.totalCount
      denom += b.totalCount
    }
    return { avg: denom > 0 ? num / denom : 0, hasData: denom > 0 }
  }, [buckets, metric])

  const headline = metric === 'count' ? 'Number of reviews' : 'Overall rating'

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 mb-3">
        <div className="justify-self-start flex items-center gap-2 text-xs">
          <h3 className="text-sm font-semibold text-mvr-primary">{headline}</h3>
          {buckets.length > 0 && hasData ? (
            <span className="text-muted-foreground">
              avg{' '}
              <span className="font-semibold text-mvr-primary tabular-nums">
                {metric === 'count' ? avg.toFixed(1) : avg.toFixed(2)}
              </span>
              <span className="ml-1">
                {metric === 'count' ? `per ${unit}` : '★'}
              </span>
            </span>
          ) : null}
        </div>
        <div className="justify-self-center">
          <Toggle
            value={metric}
            options={['rating', 'count'] as const}
            labels={METRIC_LABEL}
            onChange={setMetric}
          />
        </div>
        <div className="justify-self-end">
          <Toggle
            value={unit}
            options={['day', 'week', 'month', 'year'] as const}
            labels={UNIT_LABEL}
            onChange={setUnit}
          />
        </div>
      </div>

      {buckets.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
          No reviews in the current filter.
        </div>
      ) : metric === 'count' ? (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={buckets} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#E0DBD4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => formatTick(String(v), unit)}
                tick={{ fill: '#2D2A1C', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis tick={{ fill: '#2D2A1C', fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E0DBD4', fontSize: 12 }}
                labelFormatter={(v) => String(v)}
                formatter={(v) => [Number(v).toLocaleString(), 'reviews']}
              />
              <ReferenceLine
                y={avg}
                stroke="#B5541C"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              >
                <Label value={`avg ${avg.toFixed(1)}`} position="insideTopRight" fill="#B5541C" fontSize={10} />
              </ReferenceLine>
              <Bar dataKey="totalCount" fill="#1E2D40" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={buckets} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#E0DBD4" strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickFormatter={(v) => formatTick(String(v), unit)}
                tick={{ fill: '#2D2A1C', fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                domain={[0, 5]}
                ticks={[0, 1, 2, 3, 4, 5]}
                tick={{ fill: '#2D2A1C', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #E0DBD4', fontSize: 12 }}
                labelFormatter={(v) => String(v)}
                formatter={(value, name) => {
                  if (value == null) return ['—', String(name)]
                  return [`${Number(value).toFixed(2)} ★`, String(name)]
                }}
                itemSorter={(item) => TOOLTIP_ORDER[String(item.dataKey)] ?? 99}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={10}
              />
              <ReferenceLine
                y={avg}
                stroke="#B5541C"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              >
                <Label value={`avg ${avg.toFixed(2)} ★`} position="insideTopRight" fill="#B5541C" fontSize={10} />
              </ReferenceLine>

              {/* Overall — thicker, navy, stays on top of channel lines. */}
              <Line
                type="monotone"
                dataKey="overallRating"
                name="Overall"
                stroke="#1E2D40"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />

              {/* Per-channel lines — thinner, brand color, dot on each bucket. */}
              {activeChannels.map((c) => (
                <Line
                  key={c.key}
                  type="monotone"
                  dataKey={`rating_${c.key}`}
                  name={c.label}
                  stroke={c.color}
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: c.color }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

interface ToggleProps<T extends string> {
  value:    T
  options:  readonly T[]
  labels:   Record<T, string>
  onChange: (v: T) => void
}

function Toggle<T extends string>({ value, options, labels, onChange }: ToggleProps<T>) {
  return (
    <div className="inline-flex rounded-md border border-[#E0DBD4] overflow-hidden bg-white text-xs">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              active
                ? 'px-3 py-1 bg-mvr-primary text-white font-medium'
                : 'px-3 py-1 text-mvr-primary hover:bg-mvr-cream'
            }
          >
            {labels[opt]}
          </button>
        )
      })}
    </div>
  )
}
