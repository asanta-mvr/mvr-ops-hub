import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { upsertAction } from '@/lib/reviews/actions'
import { reviewActionPatchSchema } from '@/lib/reviews/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'customer_success.reviews'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body   = await req.json()
    const parsed = reviewActionPatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const row = await upsertAction(parsed.data, session.user.id)
    return NextResponse.json({ data: row })
  } catch (error) {
    console.error('[POST /api/v1/reviews/actions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
