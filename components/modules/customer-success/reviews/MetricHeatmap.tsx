'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  HEATMAP_COL_DIMS,
  HEATMAP_ROW_DIMS,
  type HeatmapColDim,
  type HeatmapRow,
  type HeatmapRowDim,
} from '@/lib/reviews/types'

interface Props {
  /** Initial server-rendered dataset for the default dimensions (building × day). */
  initialData:    HeatmapRow[]
  initialRowDim?: HeatmapRowDim
  initialColDim?: HeatmapColDim
  /** Active selected cell — drives the highlighted border. Null when nothing selected. */
  selectedCell?:  { rowDim: HeatmapRowDim; row: string; colDim: HeatmapColDim; col: string } | null
  /** Fires when the user clicks a cell. Null clears. The heatmap surfaces
   *  rowDim/colDim so the parent doesn't need to guess. */
  onSelectCell?:  (cell: { rowDim: HeatmapRowDim; row: string; colDim: HeatmapColDim; col: string } | null) => void
  /** Flat (un-prefixed) URL query string of the parent tab's filter scope.
   *  Used as the base of the heatmap refetch so we don't pick up other tabs'
   *  prefixed params from window.location.search. */
  scopeParams:    string
}

const ROW_LABEL: Record<HeatmapRowDim, string> = {
  building: 'Building',
  channel:  'Channel',
  rating:   'Rating',
}
const COL_LABEL: Record<HeatmapColDim, string> = {
  day:   'Day',
  week:  'Week',
  month: 'Month',
  year:  'Year',
}

// Color scales — avg-rating uses red→amber→green; count uses cream→navy ramp.
function avgRatingColor(avg: number | null): { bg: string; fg: string } {
  if (avg == null) return { bg: '#EDEAE4', fg: '#6B7280' }
  if (avg < 4)     return { bg: '#FDEEF0', fg: '#8B2030' }
  if (avg < 4.5)   return { bg: '#FDF0E6', fg: '#B5541C' }
  if (avg < 4.8)   return { bg: '#E6F4EC', fg: '#2D6A4F' }
  return { bg: '#2D6A4F', fg: '#FFFFFF' }
}

function countColor(count: number, max: number): { bg: string; fg: string } {
  if (count === 0) return { bg: '#EDEAE4', fg: '#6B7280' }
  const t = max === 0 ? 0 : count / max
  // Lerp from cream (#F7F4F0) → navy (#1E2D40).
  const r = Math.round(247 + (30  - 247) * t)
  const g = Math.round(244 + (45  - 244) * t)
  const b = Math.round(240 + (64  - 240) * t)
  const fg = t > 0.55 ? '#FFFFFF' : '#1E2D40'
  return { bg: `rgb(${r}, ${g}, ${b})`, fg }
}

const SHORT_MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function formatCol(value: string, dim: HeatmapColDim): string {
  if (dim === 'year') {
    // 'YYYY' → 'YYYY'
    return value
  }
  if (dim === 'month') {
    const [y, m] = value.split('-')
    const idx = Number(m) - 1
    return `${SHORT_MONTH[idx] ?? m} ’${y.slice(2)}`
  }
  if (dim === 'week') {
    // 'YYYY-Www' → "Wnn ’YY"
    const match = value.match(/^(\d{4})-W(\d{2})$/)
    if (match) return `W${match[2]} ’${match[1].slice(2)}`
    return value
  }
  // day: 'YYYY-MM-DD' → 'MM-DD'
  const parts = value.split('-')
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : value
}

export function MetricHeatmap({
  initialData,
  initialRowDim = 'building',
  initialColDim = 'week',
  selectedCell = null,
  onSelectCell,
  scopeParams,
}: Props) {
  const [rowDim, setRowDim]   = useState<HeatmapRowDim>(initialRowDim)
  const [colDim, setColDim]   = useState<HeatmapColDim>(initialColDim)
  const [data,   setData]     = useState<HeatmapRow[]>(initialData)
  const [loading, setLoading] = useState(false)

  const reqRef        = useRef(0)
  const isInitial     = useRef(true)

  // Refetch when dims change. Carries current URL searchParams so global
  // filters (year/OTA/building/etc.) keep applying.
  useEffect(() => {
    if (isInitial.current && rowDim === initialRowDim && colDim === initialColDim) {
      isInitial.current = false
      return
    }
    isInitial.current = false

    const reqId = ++reqRef.current
    setLoading(true)
    const qs = new URLSearchParams(scopeParams)
    qs.set('rows', rowDim)
    qs.set('cols', colDim)
    fetch(`/api/v1/reviews/heatmap?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (reqId !== reqRef.current) return
        if (json.error) setData([])
        else setData((json.data as HeatmapRow[]) ?? [])
      })
      .catch(() => { if (reqId === reqRef.current) setData([]) })
      .finally(() => { if (reqId === reqRef.current) setLoading(false) })
  }, [rowDim, colDim, initialRowDim, initialColDim, scopeParams])

  // Sync local state when the server re-renders with new initialData
  // (e.g. user changed a global filter from the URL).
  useEffect(() => {
    if (rowDim === initialRowDim && colDim === initialColDim) setData(initialData)
  }, [initialData, rowDim, colDim, initialRowDim, initialColDim])

  // Pick the cell metric. For rows=rating, avg-of-rating per row degenerates
  // to the row label itself, so count is the meaningful number to display.
  const metric: 'avgRating' | 'count' = rowDim === 'rating' ? 'count' : 'avgRating'

  const { rowLabels, colLabels, cellMap, maxCount } = useMemo(() => {
    const rowSet  = new Set<string>()
    const colSet  = new Set<string>()
    const cells   = new Map<string, HeatmapRow>()
    let maxC      = 0
    for (const x of data) {
      rowSet.add(x.row)
      colSet.add(x.col)
      cells.set(`${x.row}::${x.col}`, x)
      if (x.count > maxC) maxC = x.count
    }

    let rowOrdered: string[]
    if (rowDim === 'rating') {
      rowOrdered = Array.from(rowSet).sort((a, b) => {
        const na = Number(a), nb = Number(b)
        const aIs = !Number.isNaN(na), bIs = !Number.isNaN(nb)
        if (aIs && bIs) return nb - na
        if (aIs) return -1
        if (bIs) return 1
        return a.localeCompare(b)
      })
    } else if (rowDim === 'channel') {
      rowOrdered = Array.from(rowSet).sort()
    } else {
      // building — sort by worst latest-column rating first.
      const colOrdered = Array.from(colSet).sort()
      const lastCol = colOrdered[colOrdered.length - 1]
      rowOrdered = Array.from(rowSet).sort((a, b) => {
        const aCell = cells.get(`${a}::${lastCol}`)
        const bCell = cells.get(`${b}::${lastCol}`)
        const aw    = aCell?.avgRating ?? Infinity
        const bw    = bCell?.avgRating ?? Infinity
        if (aw === bw) return a.localeCompare(b)
        return aw - bw
      })
    }

    return {
      rowLabels: rowOrdered,
      colLabels: Array.from(colSet).sort(),
      cellMap:   cells,
      maxCount:  maxC,
    }
  }, [data, rowDim])

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-mvr-primary inline-flex items-center gap-2 justify-self-start">
          {metric === 'avgRating' ? 'Avg rating' : 'Review count'} by {ROW_LABEL[rowDim].toLowerCase()} × {COL_LABEL[colDim].toLowerCase()}
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-mvr-steel" /> : null}
        </h3>
        <div className="justify-self-center">
          <DimToggle
            value={rowDim}
            options={HEATMAP_ROW_DIMS}
            labels={ROW_LABEL}
            onChange={setRowDim}
          />
        </div>
        <div className="justify-self-end">
          <DimToggle
            value={colDim}
            options={HEATMAP_COL_DIMS}
            labels={COL_LABEL}
            onChange={setColDim}
          />
        </div>
      </div>

      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground">No reviews in the current filter.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white text-left text-mvr-primary font-medium pr-3 pb-1.5">
                  {ROW_LABEL[rowDim]}
                </th>
                {colLabels.map((c) => (
                  <th key={c} className="text-mvr-primary font-medium px-1 pb-1.5 whitespace-nowrap">
                    {formatCol(c, colDim)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowLabels.map((r) => (
                <tr key={r}>
                  <td className="sticky left-0 z-10 bg-white pr-3 py-1 text-mvr-primary font-medium whitespace-nowrap">
                    {rowDim === 'rating' && r !== '—' ? `${r} ★` : r}
                  </td>
                  {colLabels.map((c) => {
                    const cell = cellMap.get(`${r}::${c}`)
                    const { bg, fg } =
                      metric === 'avgRating'
                        ? avgRatingColor(cell?.avgRating ?? null)
                        : countColor(cell?.count ?? 0, maxCount)
                    const display =
                      metric === 'avgRating'
                        ? (cell?.avgRating != null ? cell.avgRating.toFixed(2) : '—')
                        : (cell?.count != null && cell.count > 0 ? cell.count.toLocaleString() : '—')
                    const hasData =
                      cell != null && cell.count > 0
                    const isSelected =
                      selectedCell != null &&
                      selectedCell.rowDim === rowDim &&
                      selectedCell.row === r &&
                      selectedCell.colDim === colDim &&
                      selectedCell.col === c
                    return (
                      <td key={c} className="p-0.5">
                        <div
                          role={hasData && onSelectCell ? 'button' : undefined}
                          tabIndex={hasData && onSelectCell ? 0 : -1}
                          onClick={() => {
                            if (!hasData || !onSelectCell) return
                            if (isSelected) onSelectCell(null)
                            else onSelectCell({ rowDim, row: r, colDim, col: c })
                          }}
                          onKeyDown={(e) => {
                            if (!hasData || !onSelectCell) return
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              if (isSelected) onSelectCell(null)
                              else onSelectCell({ rowDim, row: r, colDim, col: c })
                            }
                          }}
                          title={cell ? `${r} · ${c} · ${cell.avgRating?.toFixed(2) ?? '—'} avg · ${cell.count} reviews` : `${r} · ${c} · no reviews`}
                          className={[
                            'rounded text-center font-semibold tabular-nums w-14 py-1.5',
                            hasData && onSelectCell ? 'cursor-pointer transition-transform hover:scale-105' : '',
                            isSelected ? 'ring-2 ring-mvr-primary' : '',
                          ].join(' ')}
                          style={{ background: bg, color: fg }}
                        >
                          {display}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
        {metric === 'avgRating' ? (
          <>
            <LegendDot color="#FDEEF0" label="< 4.0" />
            <LegendDot color="#FDF0E6" label="4.0–4.5" />
            <LegendDot color="#E6F4EC" label="4.5–4.8" />
            <LegendDot color="#2D6A4F" label="≥ 4.8" />
          </>
        ) : (
          <>
            <LegendDot color="#F7F4F0" label="Few" />
            <LegendDot color="#1E2D40" label="Many" />
          </>
        )}
      </div>
    </div>
  )
}

interface DimToggleProps<T extends string> {
  value:    T
  options:  readonly T[]
  labels:   Record<T, string>
  onChange: (v: T) => void
}

function DimToggle<T extends string>({ value, options, labels, onChange }: DimToggleProps<T>) {
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded" style={{ background: color }} />
      {label}
    </span>
  )
}
