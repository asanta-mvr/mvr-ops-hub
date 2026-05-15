import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { getChargesForTab } from '@/lib/risk/queries'
import { chargeFiltersSchema } from '@/lib/risk/schemas'

export const dynamic = 'force-dynamic'

const RISK_LEVELS = new Set(['normal', 'elevated', 'highest'] as const)

function splitCsv(v: string | null | undefined): string[] {
  if (!v) return []
  return v.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.chargebacks'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const parsed = chargeFiltersSchema.safeParse({
      year: searchParams.get('year') ?? undefined,
      month: searchParams.get('month') ?? undefined,
      reasons: searchParams.get('reasons') ?? undefined,
      riskLevel: searchParams.get('riskLevel') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      building: searchParams.get('building') ?? undefined,
      chargeType: searchParams.get('chargeType') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const reasons = splitCsv(parsed.data.reasons)
    const riskLevels = splitCsv(parsed.data.riskLevel).filter(
      (r): r is 'normal' | 'elevated' | 'highest' => (RISK_LEVELS as Set<string>).has(r)
    )
    const statuses = splitCsv(parsed.data.status)
    const buildings = splitCsv(parsed.data.building)
    const chargeTypes = splitCsv(parsed.data.chargeType)

    const charges = await getChargesForTab({
      year: parsed.data.year,
      month: parsed.data.month,
      reasons: reasons.length > 0 ? reasons : undefined,
      // The URL's `riskLevel` may originate either from the scope filter or
      // from a KPI click; the hook merges them before the request lands here.
      // Treating it as the local (KPI) filter preserves "local wins" semantics.
      riskLevels: riskLevels.length > 0 ? riskLevels : undefined,
      statuses: statuses.length > 0 ? statuses : undefined,
      limit: parsed.data.limit,
      buildings: buildings.length > 0 ? buildings : undefined,
      chargeTypes: chargeTypes.length > 0 ? chargeTypes : undefined,
    })

    return NextResponse.json({ data: charges })
  } catch (error) {
    console.error('[GET /api/v1/risk/charges]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
