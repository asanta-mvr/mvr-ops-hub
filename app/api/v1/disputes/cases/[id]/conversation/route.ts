import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzView } from '@/lib/auth/permissions'
import { getCaseConversationSource, DisputeError } from '@/lib/disputes/cases'
import { fetchConversationMessages } from '@/lib/disputes/bq'
import { lookupReservation } from '@/lib/integrations/bigquery'

// Guest-conversation source for the Tracker inbox view. Prefers the frozen
// snapshot captured at create/dispute time (self-contained history, no live
// re-query). Falls back to a live BigQuery fetch for older cases that have no
// snapshot. Read-only (no audit).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const src = await getCaseConversationSource(params.id)
    // Frozen snapshot wins — this is the record the dispute was based on.
    if (src.snapshot) {
      return NextResponse.json({
        data: { conversationId: src.conversationId, messages: src.snapshot },
      })
    }

    // Fallback (older cases): resolve a conversationId and fetch live.
    let conversationId = src.conversationId
    if (!conversationId && src.confirmationCode) {
      const reservation = await lookupReservation(src.confirmationCode).catch(() => null)
      conversationId = reservation?.conversationId ?? null
    }
    if (!conversationId) {
      return NextResponse.json({ data: { conversationId: null, messages: [] } })
    }

    const messages = await fetchConversationMessages(conversationId).catch((e) => {
      console.error('[disputes/cases/conversation] fetch failed', e)
      return []
    })
    return NextResponse.json({ data: { conversationId, messages } })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[GET /api/v1/disputes/cases/:id/conversation]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
