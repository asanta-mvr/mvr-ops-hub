import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { fetchLatestForBucket } from '@/lib/reviews/bq'
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

    const sp       = req.nextUrl.searchParams
    const bucket   = sp.get('bucket') === 'bad' ? 'bad' : 'good'
    const tag      = sp.get('tag')?.trim() || null
    const limitRaw = Number(sp.get('limit') ?? 5)
    const limit    = Math.min(50, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 5))

    const filters = parseReviewFilters({
      year:     sp.get('year')     ?? undefined,
      building: sp.get('building') ?? undefined,
      unit:     sp.get('unit')     ?? undefined,
      ota:      sp.get('ota')      ?? undefined,
      stars:    sp.get('stars')    ?? undefined,
      q:        sp.get('q')        ?? undefined,
    })

    const rows = await fetchLatestForBucket(filters, {
      ratingGte:   bucket === 'good' ? 4 : undefined,
      ratingLte:   bucket === 'bad'  ? 3 : undefined,
      positiveTag: bucket === 'good' ? tag : null,
      negativeTag: bucket === 'bad'  ? tag : null,
      limit,
    })

    const actions = await getActionsForReviews(
      rows.map((r) => ({ otaSource: r.otaSource, externalReviewId: r.id }))
    )

    const merged: ReviewWithAction[] = rows.map((r) => ({
      ...r,
      action: actions.get(`${r.otaSource}::${r.id}`) ?? null,
    }))

    return NextResponse.json({ data: merged, bucket, tag })
  } catch (error) {
    console.error('[GET /api/v1/reviews/latest]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
