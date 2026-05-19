import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { fetchUnitSummary } from '@/lib/reviews/bq'

export const dynamic = 'force-dynamic'

// GET /api/v1/reviews/unit-summary?unit=Icon%204407
// Returns the full-history summary for a single unit — total reviews, per-OTA
// breakdown, star distribution. Powers the unit-context section at the top of
// the review detail modal.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.reviews'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const unit = req.nextUrl.searchParams.get('unit')?.trim()
    if (!unit) {
      return NextResponse.json({ error: 'Missing `unit` query param' }, { status: 400 })
    }

    const summary = await fetchUnitSummary(unit)
    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error('[GET /api/v1/reviews/unit-summary]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
