import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzView } from '@/lib/auth/permissions'
import { getCaseReservationMeta, DisputeError } from '@/lib/disputes/cases'
import { fetchConversationMessages } from '@/lib/disputes/bq'
import { lookupReservation } from '@/lib/integrations/bigquery'

// Live guest-conversation pull for the Tracker inbox view. The case only stores a
// flat transcript (no direction), so we re-fetch the structured messages from
// BigQuery via the conversationId saved in reservationMeta. Read-only (no audit).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const meta = await getCaseReservationMeta(params.id)
    // Prefer the stored conversationId (new cases); fall back to resolving it from
    // the confirmation code so cases created before this field existed still work.
    let conversationId = meta?.conversationId ?? null
    if (!conversationId && meta?.confirmationCode) {
      const reservation = await lookupReservation(meta.confirmationCode).catch(() => null)
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
