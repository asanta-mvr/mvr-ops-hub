import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { getRecentDisputes } from '@/lib/risk/queries'
import { disputeFiltersSchema } from '@/lib/risk/schemas'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.chargebacks'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const parsed = disputeFiltersSchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      reason: searchParams.get('reason') ?? undefined,
      riskLevel: searchParams.get('riskLevel') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      offset: searchParams.get('offset') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const disputes = await getRecentDisputes(parsed.data)
    return NextResponse.json({ data: disputes })
  } catch (error) {
    console.error('[GET /api/v1/risk/disputes]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
