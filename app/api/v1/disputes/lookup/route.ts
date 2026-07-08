import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { authzView } from '@/lib/auth/permissions'
import { lookupReservation } from '@/lib/integrations/bigquery'
import {
  fetchConversation,
  fetchConversationMessages,
  fetchReviewDetail,
  fetchReservationFinancials,
} from '@/lib/disputes/bq'
import { DISPUTE_OTAS, type DisputeOta } from '@/lib/disputes/types'

// Aggregated booking lookup for the Dispute Tool Analyze "Search" button:
// confirmation code → reservation metadata + guest conversation + review, in one
// call. Read-only (no audit). The conversation/review fetches are best-effort so a
// BigQuery hiccup on one doesn't fail the whole lookup.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const code = new URL(req.url).searchParams.get('confirmationCode')?.trim()
    if (!code) {
      return NextResponse.json({ error: 'confirmationCode is required' }, { status: 400 })
    }

    const reservation = await lookupReservation(code)
    if (!reservation) {
      return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
    }

    const otaForRating: DisputeOta = (DISPUTE_OTAS as readonly string[]).includes(reservation.source)
      ? (reservation.source as DisputeOta)
      : 'airbnb'

    const [conversation, messages, review, financials] = await Promise.all([
      reservation.conversationId
        ? fetchConversation(reservation.conversationId).catch((e) => {
            console.error('[disputes/lookup] conversation fetch failed', e)
            return null
          })
        : Promise.resolve(null),
      reservation.conversationId
        ? fetchConversationMessages(reservation.conversationId).catch((e) => {
            console.error('[disputes/lookup] conversation messages fetch failed', e)
            return []
          })
        : Promise.resolve([]),
      reservation.reservationId
        ? fetchReviewDetail(reservation.reservationId, otaForRating).catch((e) => {
            console.error('[disputes/lookup] review fetch failed', e)
            return null
          })
        : Promise.resolve(null),
      fetchReservationFinancials(reservation.reservationId, code).catch((e) => {
        console.error('[disputes/lookup] financials fetch failed', e)
        return null
      }),
    ])

    // Nights come ONLY from ops_reservations.nights_count — ops.gaps is one row
    // per reservation, so its row count is not the night count. ADR = payout ÷
    // nights, falling back to gaps' precomputed rental_adr (rental_adr already
    // equals payout ÷ nights for the reservation).
    const nights = reservation.nightsCount ?? null
    const payout = financials?.payout ?? null
    const adr =
      payout != null && nights != null && nights > 0
        ? Math.round((payout / nights) * 100) / 100
        : financials?.avgAdr != null
          ? Math.round(financials.avgAdr * 100) / 100
          : null

    return NextResponse.json({
      data: {
        reservation: {
          confirmationCode: code,
          ota: reservation.source, // may be vacasa/other — client decides
          guestName: reservation.guestName,
          property: reservation.property,
          unit: reservation.unit,
          checkinDate: reservation.checkinDate,
          checkoutDate: reservation.checkoutDate,
          checkinAt: reservation.checkinAt,
          checkoutAt: reservation.checkoutAt,
          nights,
          payout,
          adr,
          reservationId: reservation.reservationId,
          conversationId: reservation.conversationId,
          otaReservationId: reservation.otaReservationId,
          guestId: reservation.guestId,
        },
        conversation:
          conversation && conversation.messageCount > 0
            ? { ...conversation, messages }
            : messages.length
              ? { transcript: conversation?.transcript ?? '', messageCount: messages.length, messages }
              : null,
        review: review && review.text ? review : null,
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/disputes/lookup]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
