import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { fetchFilterOptions } from '@/lib/reviews/bq'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.reviews'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [bqOptions, assignees] = await Promise.all([
      fetchFilterOptions(),
      // Same staff cohort as the existing Tickets page — active users who can
      // realistically own a review.
      db.user.findMany({
        where:  { role: { in: ['super_admin', 'operations_manager', 'cx_agent'] }, isActive: true },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: 'asc' }, { email: 'asc' }],
      }),
    ])

    return NextResponse.json({
      data: {
        ...bqOptions,
        assignees: assignees.map((u) => ({
          id:   u.id,
          name: u.name ?? u.email,
        })),
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/reviews/options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
