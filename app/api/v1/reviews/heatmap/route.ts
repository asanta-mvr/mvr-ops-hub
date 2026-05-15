import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { fetchHeatmap } from '@/lib/reviews/bq'
import { parseReviewFilters } from '@/lib/reviews/filters'
import {
  HEATMAP_COL_DIMS,
  HEATMAP_ROW_DIMS,
  type HeatmapColDim,
  type HeatmapRowDim,
} from '@/lib/reviews/types'

export const dynamic = 'force-dynamic'

function asRowDim(v: string | null): HeatmapRowDim {
  return (HEATMAP_ROW_DIMS as readonly string[]).includes(v ?? '') ? (v as HeatmapRowDim) : 'building'
}
function asColDim(v: string | null): HeatmapColDim {
  return (HEATMAP_COL_DIMS as readonly string[]).includes(v ?? '') ? (v as HeatmapColDim) : 'month'
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.reviews'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const filters = parseReviewFilters({
      year:     sp.get('year')     ?? undefined,
      building: sp.get('building') ?? undefined,
      unit:     sp.get('unit')     ?? undefined,
      ota:      sp.get('ota')      ?? undefined,
      stars:    sp.get('stars')    ?? undefined,
      q:        sp.get('q')        ?? undefined,
    })

    const rowDim = asRowDim(sp.get('rows'))
    const colDim = asColDim(sp.get('cols'))
    const data   = await fetchHeatmap(filters, rowDim, colDim)
    return NextResponse.json({ data, rows: rowDim, cols: colDim })
  } catch (error) {
    console.error('[GET /api/v1/reviews/heatmap]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
