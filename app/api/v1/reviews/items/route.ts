import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { fetchReviewsList } from '@/lib/reviews/bq'
import { getActionsForReviews } from '@/lib/reviews/actions'
import { parseReviewFilters } from '@/lib/reviews/filters'
import type { ReviewWithAction } from '@/lib/reviews/types'

export const dynamic = 'force-dynamic'

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
      page:     sp.get('page')     ?? undefined,
      pageSize: sp.get('pageSize') ?? undefined,
    })

    const { rows, totalCount } = await fetchReviewsList(filters)
    const actions = await getActionsForReviews(
      rows.map((r) => ({ otaSource: r.otaSource, externalReviewId: r.id }))
    )

    const merged: ReviewWithAction[] = rows.map((r) => ({
      ...r,
      action: actions.get(`${r.otaSource}::${r.id}`) ?? null,
    }))

    return NextResponse.json({
      data: {
        rows:     merged,
        totalCount,
        page:     filters.page,
        pageSize: filters.pageSize,
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/reviews/items]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
