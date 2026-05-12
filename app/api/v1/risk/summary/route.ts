import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRiskSummary } from '@/lib/risk/queries'
import { ALLOWED_RISK_ROLES, summaryFilterSchema } from '@/lib/risk/schemas'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const parsed = summaryFilterSchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const summary = await getRiskSummary(parsed.data.year, parsed.data.month)
    return NextResponse.json({ data: summary })
  } catch (error) {
    console.error('[GET /api/v1/risk/summary]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
