// BigQuery fetchers for the Dispute Tool reservation lookup: the guest
// conversation transcript and the processed review detail. Reuses the shared
// client from lib/integrations/bigquery.ts. See docs/dispute-sources-bq-schema.md
// for the column/join map this is built against.

import { getBigQueryClient } from '@/lib/integrations/bigquery'
import type { ConversationMessage, ConversationSender, DisputeOta } from './types'

const MAX_POSTS = 300
const MAX_TRANSCRIPT_CHARS = 14000

export interface ConversationResult {
  transcript: string
  messageCount: number
}

export interface ReviewDetail {
  text: string | null
  rating: number | null
}

export interface ReservationFinancials {
  payout: number | null // total accommodation fare across the stay (ops.gaps)
  gapNights: number | null // night-rows found in ops.gaps
  avgAdr: number | null // precomputed ADR averaged over the stay
}

/**
 * Aggregates the per-night rows in ops.gaps for a reservation into a total
 * accommodation fare (payout) + precomputed-ADR average. Joined by reservation_id,
 * falling back to confirmation_code. Returns nulls when the reservation has no rows.
 */
export async function fetchReservationFinancials(
  reservationId: string | null,
  confirmationCode: string | null
): Promise<ReservationFinancials> {
  if (!reservationId && !confirmationCode) return { payout: null, gapNights: null, avgAdr: null }
  const bq = getBigQueryClient()
  const [rows] = await bq.query({
    query: `
      SELECT
        SUM(SAFE_CAST(fare_accommodation AS FLOAT64)) AS payout,
        AVG(rental_adr)                               AS avg_adr,
        COUNT(*)                                      AS gap_nights
      FROM \`miami-vr-data.ops.gaps\`
      WHERE (@reservationId != '' AND reservation_id = @reservationId)
         OR (@reservationId = '' AND UPPER(confirmation_code) = UPPER(@confirmationCode))
    `,
    params: { reservationId: reservationId ?? '', confirmationCode: confirmationCode ?? '' },
    useLegacySql: false,
  })

  if (!rows || rows.length === 0) return { payout: null, gapNights: null, avgAdr: null }
  const r = rows[0] as { payout?: number | null; avg_adr?: number | null; gap_nights?: number | null }
  const gapNights = r.gap_nights != null ? Number(r.gap_nights) : null
  return {
    payout: r.payout != null ? Number(r.payout) : null,
    gapNights: gapNights && gapNights > 0 ? gapNights : null,
    avgAdr: r.avg_adr != null ? Number(r.avg_adr) : null,
  }
}

// Strips HTML, normalizes whitespace — Guesty post bodies are often HTML emails.
function cleanBody(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '?'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '?' : d.toISOString().slice(0, 16).replace('T', ' ')
}

/**
 * Pulls the guest conversation for a Guesty conversation id and renders it as a
 * chronological transcript. NOTE: the synced table has no per-message
 * sender/direction field, so lines are labelled by channel + timestamp only.
 */
export async function fetchConversation(conversationId: string): Promise<ConversationResult> {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({
    query: `
      SELECT
        JSON_VALUE(json_payload, '$.body')        AS body,
        JSON_VALUE(json_payload, '$.createdAt')   AS created_at,
        JSON_VALUE(json_payload, '$.module.type') AS module_type
      FROM \`miami-vr-data.guesty.conversation_posts\`
      WHERE JSON_VALUE(json_payload, '$.conversationId') = @conversationId
      ORDER BY JSON_VALUE(json_payload, '$.createdAt')
      LIMIT ${MAX_POSTS}
    `,
    params: { conversationId },
    useLegacySql: false,
  })

  const posts = rows as Array<{ body?: string; created_at?: string; module_type?: string }>
  const lines: string[] = []
  for (const p of posts) {
    const body = cleanBody(p.body)
    if (!body) continue
    const channel = p.module_type ? `${p.module_type}` : 'message'
    lines.push(`[${fmtDate(p.created_at)}] (${channel}) ${body}`)
  }

  let transcript = lines.join('\n')
  if (transcript.length > MAX_TRANSCRIPT_CHARS) {
    transcript = transcript.slice(-MAX_TRANSCRIPT_CHARS) // keep the most recent context
  }
  return { transcript, messageCount: lines.length }
}

/**
 * Pulls the guest conversation as STRUCTURED messages for the inbox view, using
 * the `sentBy` direction signal (guest/host/log) that the flat transcript drops.
 * Bodies are HTML-stripped; empty bodies (pure logs with no text) are skipped
 * unless they're `log` entries, which we keep as system notes.
 */
export async function fetchConversationMessages(
  conversationId: string
): Promise<ConversationMessage[]> {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({
    query: `
      SELECT
        JSON_VALUE(json_payload, '$._id')          AS id,
        JSON_VALUE(json_payload, '$.sentBy')        AS sent_by,
        JSON_VALUE(json_payload, '$.userName')      AS user_name,
        JSON_VALUE(json_payload, '$.module.type')   AS channel,
        JSON_VALUE(json_payload, '$.body')          AS body,
        JSON_VALUE(json_payload, '$.createdAt')     AS created_at,
        JSON_VALUE(json_payload, '$.isAutomatic')   AS is_automatic
      FROM \`miami-vr-data.guesty.conversation_posts\`
      WHERE JSON_VALUE(json_payload, '$.conversationId') = @conversationId
      ORDER BY JSON_VALUE(json_payload, '$.createdAt')
      LIMIT ${MAX_POSTS}
    `,
    params: { conversationId },
    useLegacySql: false,
  })

  const out: ConversationMessage[] = []
  for (const r of rows as Array<Record<string, string | null>>) {
    const raw = (r.sent_by ?? '').toLowerCase()
    const sentBy: ConversationSender = raw === 'guest' ? 'guest' : raw === 'log' ? 'log' : 'host'
    const body = cleanBody(r.body)
    if (!body) continue
    out.push({
      id: r.id ?? `msg-${out.length}`,
      sentBy,
      userName: r.user_name || null,
      channel: r.channel || null,
      body,
      createdAt: r.created_at ?? '',
      isAutomatic: r.is_automatic === 'true',
    })
  }
  return out
}

/**
 * Pulls the processed review for a reservation and picks the overall rating for
 * the booking's OTA. Returns null fields when no review exists.
 */
export async function fetchReviewDetail(
  reservationId: string,
  ota: DisputeOta
): Promise<ReviewDetail> {
  const bq = getBigQueryClient()
  const [rows] = await bq.query({
    query: `
      SELECT combined_review_text,
             airbnb_overall_rating,
             vrbo_overall_rating,
             bdc_review_rating_fixed,
             bdc_review_rating
      FROM \`miami-vr-data.ops.ops_reviews_processed\`
      WHERE reservation_id = @reservationId
      ORDER BY created_at DESC
      LIMIT 1
    `,
    params: { reservationId },
    useLegacySql: false,
  })

  if (!rows || rows.length === 0) return { text: null, rating: null }

  const r = rows[0] as {
    combined_review_text?: string | null
    airbnb_overall_rating?: number | null
    vrbo_overall_rating?: number | null
    bdc_review_rating_fixed?: number | null
    bdc_review_rating?: number | null
  }

  const ratingByOta: Record<DisputeOta, number | null | undefined> = {
    airbnb: r.airbnb_overall_rating,
    vrbo: r.vrbo_overall_rating,
    booking: r.bdc_review_rating_fixed ?? r.bdc_review_rating,
    expedia: null, // no expedia-specific column in this table
  }
  const rating =
    ratingByOta[ota] ??
    r.airbnb_overall_rating ??
    r.vrbo_overall_rating ??
    r.bdc_review_rating_fixed ??
    r.bdc_review_rating ??
    null

  return { text: r.combined_review_text ?? null, rating: rating ?? null }
}
