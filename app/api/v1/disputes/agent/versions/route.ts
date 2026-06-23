import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzView } from '@/lib/auth/permissions'
import { listVersions } from '@/lib/disputes/agent'

export async function GET() {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    return NextResponse.json({ data: await listVersions() })
  } catch (error) {
    console.error('[GET /api/v1/disputes/agent/versions]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
