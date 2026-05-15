'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Star, ThumbsDown, ThumbsUp } from 'lucide-react'
import type { OtaSource } from '@prisma/client'
import type { ReviewWithAction } from '@/lib/reviews/types'
import { ReviewActionDrawer } from './ReviewActionDrawer'

interface Props {
  /** Reviews to render on the left (≥ 4 ★). Parent decides where they came from. */
  goodRows:           ReviewWithAction[]
  /** Reviews to render on the right (≤ 3 ★). Parent decides where they came from. */
  badRows:            ReviewWithAction[]
  /** When set, the column header notes the active tag filter. */
  positiveTagFilter?: string | null
  negativeTagFilter?: string | null
  /** Independent loading flags so each panel shows a spinner during its own
   *  re-fetch (e.g. clicking a positive tag only re-loads `goodRows`). */
  loadingGood?:       boolean
  loadingBad?:        boolean
  /** Total fetched size — drives the refetch from the parent. */
  goodLimit:          number
  badLimit:           number
  onChangeGoodLimit:  (n: number) => void
  onChangeBadLimit:   (n: number) => void
  assigneeOptions:    Array<{ id: string; name: string }>
  onActionSaved?:     (row: ReviewWithAction) => void
}

const OTA_LABEL: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking', vrbo: 'Vrbo',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}

const PAGE_OPTIONS = [5, 10, 15, 30, 50] as const
const DISPLAY_PER_PAGE = 5

function snippet(text: string | null | undefined, n = 110): string {
  if (!text) return '—'
  return text.length > n ? text.slice(0, n - 1).trimEnd() + '…' : text
}

export function LatestReviewsSplit({
  goodRows,
  badRows,
  positiveTagFilter = null,
  negativeTagFilter = null,
  loadingGood = false,
  loadingBad  = false,
  goodLimit,
  badLimit,
  onChangeGoodLimit,
  onChangeBadLimit,
  assigneeOptions,
  onActionSaved,
}: Props) {
  const [drawerRow, setDrawerRow] = useState<ReviewWithAction | null>(null)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <Column
        title="Latest good (≥ 4 ★)"
        subtitle={positiveTagFilter ? `Filtered by tag: ${positiveTagFilter}` : undefined}
        icon={<ThumbsUp className="w-4 h-4 text-mvr-success" />}
        accent="border-mvr-success-light"
        rows={goodRows}
        loading={loadingGood}
        limit={goodLimit}
        onChangeLimit={onChangeGoodLimit}
        onOpen={setDrawerRow}
        emptyLabel={
          positiveTagFilter
            ? `No reviews tagged "${positiveTagFilter}" with ≥4★ in this scope.`
            : 'No good reviews in this scope.'
        }
      />
      <Column
        title="Latest bad (≤ 3 ★)"
        subtitle={negativeTagFilter ? `Filtered by tag: ${negativeTagFilter}` : undefined}
        icon={<ThumbsDown className="w-4 h-4 text-mvr-danger" />}
        accent="border-mvr-danger-light"
        rows={badRows}
        loading={loadingBad}
        limit={badLimit}
        onChangeLimit={onChangeBadLimit}
        onOpen={setDrawerRow}
        emptyLabel={
          negativeTagFilter
            ? `No reviews tagged "${negativeTagFilter}" with ≤3★ in this scope.`
            : 'No bad reviews — nice work.'
        }
      />

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

interface ColumnProps {
  title:         string
  subtitle?:     string
  icon:          React.ReactNode
  accent:        string
  rows:          ReviewWithAction[]
  loading:       boolean
  limit:         number
  onChangeLimit: (n: number) => void
  onOpen:        (r: ReviewWithAction) => void
  emptyLabel:    string
}

function Column({
  title, subtitle, icon, accent, rows, loading, limit, onChangeLimit, onOpen, emptyLabel,
}: ColumnProps) {
  const [page, setPage] = useState(0)

  // Reset to first page whenever the underlying rows or limit change
  // (e.g. tag filter changed or pageSize bumped → freshly fetched data).
  const firstId = rows[0]?.id ?? null
  useEffect(() => { setPage(0) }, [limit, rows.length, firstId])

  const pageCount = Math.max(1, Math.ceil(rows.length / DISPLAY_PER_PAGE))
  const safePage  = Math.min(page, pageCount - 1)
  const start     = safePage * DISPLAY_PER_PAGE
  const slice     = rows.slice(start, start + DISPLAY_PER_PAGE)

  return (
    <div className={`bg-white border-2 ${accent} rounded-xl shadow-card flex flex-col`}>
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#E0DBD4]">
        {icon}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-mvr-primary leading-tight">{title}</h3>
          {subtitle ? <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p> : null}
        </div>
        <span className="text-xs text-muted-foreground ml-auto inline-flex items-center gap-1">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
          {rows.length} shown
        </span>
      </div>

      <div className="flex-1 min-h-[160px]">
        {rows.length === 0 ? (
          <p className="px-4 py-6 text-xs text-muted-foreground italic">
            {loading ? 'Loading…' : emptyLabel}
          </p>
        ) : (
          <ul className="divide-y divide-[#E0DBD4]">
            {slice.map((r) => (
              <li key={r.id} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                <div className="flex items-center gap-1 text-mvr-warning font-semibold w-12">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {r.rating ?? '—'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-mvr-primary font-medium truncate">
                      {r.unitName ?? '—'}
                      {r.guestName ? (
                        <span className="text-mvr-olive font-normal"> · {r.guestName}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {r.date} · {OTA_LABEL[r.otaSource]}
                    </span>
                  </div>
                  <p className="text-mvr-olive text-xs">{snippet(r.description)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpen(r)}
                  className="inline-flex items-center rounded-md border border-[#E0DBD4] px-2 py-0.5 text-xs font-medium text-mvr-primary hover:bg-mvr-cream"
                >
                  Action
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer: page-size selector (left) + prev/next arrows (right) */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-t border-[#E0DBD4] text-xs">
        <label className="inline-flex items-center gap-1.5 text-muted-foreground">
          Show
          <select
            value={limit}
            onChange={(e) => onChangeLimit(Number(e.target.value))}
            className="rounded-md border border-[#E0DBD4] bg-white px-1 py-0.5 text-mvr-primary"
          >
            {PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <div className="inline-flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="tabular-nums text-mvr-primary">{safePage + 1} / {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage + 1 >= pageCount}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}
