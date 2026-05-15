import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import {
  fetchDailyVolume,
  fetchHeatmap,
  fetchReviewsKPIs,
  fetchReviewsMonthlyTrend,
  fetchTagDistribution,
} from '@/lib/reviews/bq'
import { getDisputeStats } from '@/lib/reviews/actions'
import { parseReviewFilters } from '@/lib/reviews/filters'

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
    })

    const [summary, monthly, heatmap, dailyVolume, tagDistribution, disputes] = await Promise.all([
      fetchReviewsKPIs(filters),
      fetchReviewsMonthlyTrend(filters),
      fetchHeatmap(filters, 'building', 'week'),
      fetchDailyVolume(filters),
      fetchTagDistribution(filters),
      getDisputeStats(),
    ])

    const disputeStats = {
      ...disputes,
      disputedPct:
        summary.totalReviews > 0
          ? (disputes.disputingNow + disputes.wonYtd + disputes.lostYtd + disputes.closedYtd) /
            summary.totalReviews
          : null,
    }

    return NextResponse.json({
      data: { summary, monthly, heatmap, dailyVolume, tagDistribution, disputeStats },
    })
  } catch (error) {
    console.error('[GET /api/v1/reviews/summary]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
