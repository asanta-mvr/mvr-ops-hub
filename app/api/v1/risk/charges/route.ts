import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getChargesForTab } from '@/lib/risk/queries'
import { ALLOWED_RISK_ROLES, chargeFiltersSchema } from '@/lib/risk/schemas'

export const dynamic = 'force-dynamic'

const RISK_LEVELS = new Set(['normal', 'elevated', 'highest'] as const)

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const parsed = chargeFiltersSchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      reasons: searchParams.get('reasons') ?? undefined,
      riskLevel: searchParams.get('riskLevel') ?? undefined,
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
    const riskLevels = parsed.data.riskLevel
      ? (parsed.data.riskLevel
          .split(',')
          .map((r) => r.trim())
          .filter((r): r is 'normal' | 'elevated' | 'highest' =>
            (RISK_LEVELS as Set<string>).has(r)
          ))
      : undefined

    const charges = await getChargesForTab({
      year: parsed.data.year,
      month: parsed.data.month,
      reasons,
      riskLevels,
      limit: parsed.data.limit,
    })

    return NextResponse.json({ data: charges })
  } catch (error) {
    console.error('[GET /api/v1/risk/charges]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
