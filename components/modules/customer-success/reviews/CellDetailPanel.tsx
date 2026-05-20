'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Loader2, MessageSquare, Star, X } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import type {
  HeatmapColDim,
  HeatmapRowDim,
  ReviewActionStatus,
  ReviewWithAction,
} from '@/lib/reviews/types'
import { ReviewActionDrawer } from './ReviewActionDrawer'

export interface SelectedCell {
  rowDim: HeatmapRowDim
  row:    string
  colDim: HeatmapColDim
  col:    string
}

interface Props {
  selectedCell:    SelectedCell | null
  onClear:         () => void
  /** Flat (un-prefixed) URL query string of the parent tab's filter scope.
   *  Used as the base of the cell-drill-down fetch so we don't pick up
   *  other tabs' prefixed params from window.location.search. */
  scopeParams:     string
  assigneeOptions: Array<{ id: string; name: string }>
  onActionSaved?:  (row: ReviewWithAction) => void
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

const ROW_LABEL: Record<HeatmapRowDim, string> = {
  building: 'Building',
  channel:  'Channel',
  rating:   'Rating',
}
const COL_LABEL: Record<HeatmapColDim, string> = {
  day:   'Day',
  week:  'Week',
  month: 'Month',
}

function ratingTone(rating: number | null): string {
  if (rating == null) return 'text-muted-foreground'
  if (rating <= 2)    return 'text-mvr-danger'
  if (rating === 3)   return 'text-mvr-warning'
  return 'text-mvr-success'
}

const PAGE_SIZE = 10
const DISPUTE_STATUSES: ReadonlyArray<ReviewActionStatus> = ['disputing', 'dispute_won', 'dispute_lost', 'closed_no_change']

export function CellDetailPanel({ selectedCell, onClear, scopeParams, assigneeOptions, onActionSaved }: Props) {
  const [rows, setRows]             = useState<ReviewWithAction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage]             = useState(0)
  const [loading, setLoading]       = useState(false)
  const [drawerRow, setDrawerRow]   = useState<ReviewWithAction | null>(null)
  const reqRef = useRef(0)

  // Reset paging when the selection changes.
  useEffect(() => { setPage(0) }, [selectedCell?.rowDim, selectedCell?.row, selectedCell?.colDim, selectedCell?.col])

  useEffect(() => {
    if (!selectedCell) {
      setRows([])
      setTotalCount(0)
      setLoading(false)
      return
    }
    const reqId = ++reqRef.current
    setLoading(true)
    const qs = new URLSearchParams(scopeParams)
    qs.set('rowDim',  selectedCell.rowDim)
    qs.set('row',     selectedCell.row)
    qs.set('colDim',  selectedCell.colDim)
    qs.set('col',     selectedCell.col)
    qs.set('page',    String(page))
    qs.set('pageSize', String(PAGE_SIZE))
    fetch(`/api/v1/reviews/cell?${qs.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (reqId !== reqRef.current) return
        if (json.error) { setRows([]); setTotalCount(0) }
        else {
          setRows((json.data as ReviewWithAction[]) ?? [])
          setTotalCount(Number(json.totalCount ?? 0))
        }
      })
      .catch(() => { if (reqId === reqRef.current) { setRows([]); setTotalCount(0) } })
      .finally(() => { if (reqId === reqRef.current) setLoading(false) })
  }, [selectedCell, page, scopeParams])

  if (!selectedCell) {
    return (
      <div className="bg-white border border-dashed border-[#E0DBD4] rounded-xl p-6 text-center text-xs text-muted-foreground">
        Click a cell in the heatmap above to see the reviews behind it here.
      </div>
    )
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const firstShown = totalCount === 0 ? 0 : page * PAGE_SIZE + 1
  const lastShown  = Math.min((page + 1) * PAGE_SIZE, totalCount)

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl shadow-card">
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#E0DBD4]">
        <div className="flex items-center gap-2 text-sm">
          <h3 className="text-mvr-primary font-semibold">Review detail</h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-mvr-primary-light text-mvr-primary px-2 py-0.5 text-xs">
            {ROW_LABEL[selectedCell.rowDim]}: <strong>{selectedCell.row}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-mvr-primary-light text-mvr-primary px-2 py-0.5 text-xs">
            {COL_LABEL[selectedCell.colDim]}: <strong>{selectedCell.col}</strong>
          </span>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-mvr-steel" /> : null}
        </div>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1 text-xs text-mvr-primary border border-[#E0DBD4] rounded-md px-2 py-1 hover:bg-mvr-cream"
        >
          Clear <X className="w-3 h-3" />
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted-foreground italic">
          {loading ? 'Loading…' : 'No reviews for this cell within the current scope.'}
        </p>
      ) : (
        <ul className="divide-y divide-[#E0DBD4]">
          {rows.map((r) => {
            const icon   = OTA_ICON[r.otaSource]
            const status = r.action?.status ?? null
            const isDisputing = status != null && DISPUTE_STATUSES.includes(status)
            return (
              <li key={r.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                <div className={`flex items-center gap-1 w-12 font-semibold ${ratingTone(r.rating)}`}>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {r.rating ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-mvr-primary font-medium">{r.unitName ?? '—'}</span>
                    {r.guestName ? (
                      <span className="text-mvr-olive">· {r.guestName}</span>
                    ) : null}
                    {icon ? (
                      <Image src={icon} alt={OTA_LABEL[r.otaSource]} width={14} height={14} className="object-contain rounded" />
                    ) : null}
                    <span className="text-xs text-muted-foreground">{OTA_LABEL[r.otaSource]}</span>
                    <span className="text-xs text-muted-foreground">· {r.date}</span>
                  </div>
                  {r.description ? (
                    <p className="text-mvr-olive text-xs mt-0.5 whitespace-pre-wrap">{r.description}</p>
                  ) : (
                    <p className="text-xs italic text-muted-foreground mt-0.5">No review body.</p>
                  )}
                  {(r.positiveTags.length > 0 || r.negativeTags.length > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.positiveTags.map((t) => (
                        <span key={`p-${t}`} className="bg-mvr-success-light text-mvr-success rounded-full px-1.5 py-0.5 text-[10px]">
                          + {t}
                        </span>
                      ))}
                      {r.negativeTags.map((t) => (
                        <span key={`n-${t}`} className="bg-mvr-danger-light text-mvr-danger rounded-full px-1.5 py-0.5 text-[10px]">
                          − {t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    {r.hostResponded ? (
                      <span className="inline-flex items-center gap-1 text-mvr-success">
                        <MessageSquare className="w-3 h-3" /> Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-mvr-danger">
                        <MessageSquare className="w-3 h-3" /> Not replied
                      </span>
                    )}
                    {status ? (
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_STYLE[status].bg}`}>
                        {STATUS_STYLE[status].label}
                      </span>
                    ) : null}
                    {r.action?.assignedToName ? (
                      <span>· Assigned to <span className="text-mvr-primary font-medium">{r.action.assignedToName}</span></span>
                    ) : null}
                    {isDisputing ? (
                      <span className="text-mvr-warning font-medium">· In dispute pipeline</span>
                    ) : null}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerRow(r)}
                  className="inline-flex items-center rounded-md border border-[#E0DBD4] px-2 py-0.5 text-xs font-medium text-mvr-primary hover:bg-mvr-cream"
                >
                  Action
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between text-xs text-muted-foreground px-4 py-2 border-t border-[#E0DBD4]">
        <span>
          {totalCount === 0
            ? '0 reviews'
            : `Showing ${firstShown.toLocaleString()}–${lastShown.toLocaleString()} of ${totalCount.toLocaleString()}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-3 h-3" /> Prev
          </button>
          <span className="tabular-nums">Page {page + 1} / {totalPages}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
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
            setRows((prev) =>
              prev.map((x) =>
                x.id === merged.id && x.otaSource === merged.otaSource ? merged : x
              )
            )
            setDrawerRow(null)
          }}
        />
      ) : null}
    </div>
  )
}
