import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzEdit } from '@/lib/auth/permissions'
import { knowledgeExtractSchema } from '@/lib/validations/dispute'
import { extractFromUrl } from '@/lib/disputes/knowledge'
import { DisputeError } from '@/lib/disputes/cases'

// Fetches an OTA policy URL and returns an AI-drafted knowledge entry the user
// reviews before saving. No DB write here. SSRF-guarded (https-only OTA allowlist).
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = knowledgeExtractSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const draft = await extractFromUrl(parsed.data.url)
    return NextResponse.json({ data: draft })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'fetch_failed') {
      return NextResponse.json({ error: error.message }, { status: 502 })
    }
    console.error('[POST /api/v1/disputes/knowledge/extract]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
