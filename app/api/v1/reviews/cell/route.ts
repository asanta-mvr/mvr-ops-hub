import { NextRequest, NextResponse } from 'next/server'
import type { OtaSource } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { fetchReviewsList } from '@/lib/reviews/bq'
import { getActionsForReviews } from '@/lib/reviews/actions'
import { parseReviewFilters } from '@/lib/reviews/filters'
import {
  HEATMAP_COL_DIMS,
  HEATMAP_ROW_DIMS,
  type HeatmapColDim,
  type HeatmapRowDim,
  type ReviewFilters,
  type ReviewWithAction,
} from '@/lib/reviews/types'

export const dynamic = 'force-dynamic'

// ── Date math for column dimensions ───────────────────────────────────────

function monthRange(yyyymm: string): { from: string; to: string } | null {
  const [y, m] = yyyymm.split('-').map(Number)
  if (!y || !m) return null
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm   = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
}

function isoWeekRange(yyyyWww: string): { from: string; to: string } | null {
  const match = yyyyWww.match(/^(\d{4})-W(\d{2})$/)
  if (!match) return null
  const year = Number(match[1])
  const week = Number(match[2])
  // ISO week 1 contains January 4th. Monday of that week is the anchor.
  const jan4    = new Date(Date.UTC(year, 0, 4))
  const jan4Dow = jan4.getUTCDay() || 7
  const week1Mon = new Date(jan4)
  week1Mon.setUTCDate(jan4.getUTCDate() - (jan4Dow - 1))
  const targetMon = new Date(week1Mon)
  targetMon.setUTCDate(week1Mon.getUTCDate() + (week - 1) * 7)
  const targetSun = new Date(targetMon)
  targetSun.setUTCDate(targetMon.getUTCDate() + 6)
  return {
    from: targetMon.toISOString().slice(0, 10),
    to:   targetSun.toISOString().slice(0, 10),
  }
}

// Channel-name → OtaSource (mirrors lib/integrations/bigquery.ts mapOta).
function mapOta(raw: string): OtaSource {
  const lower = raw.toLowerCase()
  if (lower.includes('airbnb'))                            return 'airbnb'
  if (lower.includes('booking') || lower.includes('bkns')) return 'booking'
  if (lower.includes('vrbo') || lower.includes('homeaway')) return 'vrbo'
  if (lower.includes('expedia'))                            return 'expedia'
  if (lower.includes('vacasa'))                             return 'vacasa'
  return 'other'
}

function asRowDim(v: string | null): HeatmapRowDim | null {
  return v && (HEATMAP_ROW_DIMS as readonly string[]).includes(v) ? (v as HeatmapRowDim) : null
}
function asColDim(v: string | null): HeatmapColDim | null {
  return v && (HEATMAP_COL_DIMS as readonly string[]).includes(v) ? (v as HeatmapColDim) : null
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.reviews'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp     = req.nextUrl.searchParams
    const rowDim = asRowDim(sp.get('rowDim'))
    const colDim = asColDim(sp.get('colDim'))
    const row    = sp.get('row')?.trim() ?? ''
    const col    = sp.get('col')?.trim() ?? ''
    const page     = Math.max(0, Number(sp.get('page') ?? 0))
    const pageSize = Math.min(50, Math.max(1, Number(sp.get('pageSize') ?? 10)))

    if (!rowDim || !colDim || !row || !col) {
      return NextResponse.json({ error: 'Missing required params' }, { status: 400 })
    }

    // Start from the user's current global filters carried via querystring,
    // then layer the cell coords on top so the drill-down respects scope.
    const filters: ReviewFilters = parseReviewFilters({
      year:     sp.get('year')     ?? undefined,
      building: sp.get('building') ?? undefined,
      unit:     sp.get('unit')     ?? undefined,
      ota:      sp.get('ota')      ?? undefined,
      stars:    sp.get('stars')    ?? undefined,
      q:        sp.get('q')        ?? undefined,
    })

    // Row dimension override.
    if (rowDim === 'building') {
      filters.buildings = [row]
    } else if (rowDim === 'channel') {
      filters.otas = [mapOta(row) as string]
    } else if (rowDim === 'rating') {
      // The heatmap label "—" means rating IS NULL; no UI filter for that
      // exists yet, so skip — the cell will just match nothing extra.
      if (row !== '—') {
        const n = Number(row)
        if (n >= 1 && n <= 5) filters.stars = [n]
      }
    }

    // Column dimension override (date range, replacing any prior from/to).
    if (colDim === 'day') {
      filters.dateFrom = col
      filters.dateTo   = col
    } else if (colDim === 'month') {
      const range = monthRange(col)
      if (range) { filters.dateFrom = range.from; filters.dateTo = range.to }
    } else if (colDim === 'week') {
      const range = isoWeekRange(col)
      if (range) { filters.dateFrom = range.from; filters.dateTo = range.to }
    }

    filters.page     = page
    filters.pageSize = pageSize

    const { rows, totalCount } = await fetchReviewsList(filters)
    const actions = await getActionsForReviews(
      rows.map((r) => ({ otaSource: r.otaSource, externalReviewId: r.id }))
    )

    const merged: ReviewWithAction[] = rows.map((r) => ({
      ...r,
      action: actions.get(`${r.otaSource}::${r.id}`) ?? null,
    }))

    return NextResponse.json({ data: merged, totalCount, page, pageSize })
  } catch (error) {
    console.error('[GET /api/v1/reviews/cell]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
