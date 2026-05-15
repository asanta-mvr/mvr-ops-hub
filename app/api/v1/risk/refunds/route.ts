import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { getRecentRefunds } from '@/lib/risk/queries'
import { refundFiltersSchema } from '@/lib/risk/schemas'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.chargebacks'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const parsed = refundFiltersSchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      reasons: searchParams.get('reasons') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const reasons = parsed.data.reasons
      ? parsed.data.reasons.split(',').map((r) => r.trim()).filter(Boolean)
      : undefined

    const refunds = await getRecentRefunds({
      year: parsed.data.year,
      month: parsed.data.month,
      reasons,
      limit: parsed.data.limit,
    })

    return NextResponse.json({ data: refunds })
  } catch (error) {
    console.error('[GET /api/v1/risk/refunds]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
