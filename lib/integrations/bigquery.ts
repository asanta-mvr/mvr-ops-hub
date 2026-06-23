import { BigQuery } from '@google-cloud/bigquery'
import type { OtaSource } from '@prisma/client'

const bigquery = new BigQuery({
  projectId: process.env.BQ_PROJECT_ID ?? 'miami-vr-data',
  ...(process.env.BQ_CLIENT_EMAIL && process.env.BQ_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.BQ_CLIENT_EMAIL,
          private_key: process.env.BQ_PRIVATE_KEY.replace(/\\n/g, '\n'),
        },
      }
    : {}),
})

// Shared accessor for other modules (reviews, future BQ-backed features).
// Single BigQuery client per process — same credentials, same project.
export function getBigQueryClient(): BigQuery {
  return bigquery
}

// Substring patterns mapped to OtaSource enum values.
// Order matters: more specific patterns first.
const OTA_PATTERNS: Array<[string, OtaSource]> = [
  ['airbnb',   'airbnb'],
  ['booking',  'booking'],
  ['bkns',     'booking'],
  ['homeaway', 'vrbo'],
  ['vrbo',     'vrbo'],
  ['expedia',  'expedia'],
  ['vacasa',   'vacasa'],
]

function mapOta(raw: string | null | undefined): OtaSource {
  if (!raw) return 'other'
  const lower = raw.toLowerCase()
  for (const [pattern, value] of OTA_PATTERNS) {
    if (lower.includes(pattern)) return value
  }
  return 'other'
}

export interface ReservationLookup {
  source:       OtaSource
  guestName:    string | null
  guestPhone:   string | null
  property:     string | null
  unit:         string | null
  checkinDate:  string | null // ISO (date-only, localized)
  checkoutDate: string | null
  checkinAt:    string | null // ISO timestamp (date + time, UTC) from check_in
  checkoutAt:   string | null // ISO timestamp (date + time, UTC) from check_out
  nightsCount:  number | null
  // Join keys (used by the Dispute Tool to pull the conversation + review).
  reservationId:    string | null // Guesty reservation id → ops_reviews_processed.reservation_id
  conversationId:   string | null // Guesty conversation id → conversation_posts.json_payload.conversationId
  otaReservationId: string | null
  guestId:          string | null
}

export async function lookupReservation(confirmationCode: string): Promise<ReservationLookup | null> {
  const query = `
    SELECT source, guest_full_name, building_name, listing_nickname,
           check_in_date_localized, check_out_date_localized,
           check_in, check_out, nights_count,
           reservation_id, conversation_id, ota_reservation_id, guest_id
    FROM \`miami-vr-data.ops.ops_reservations\`
    WHERE UPPER(confirmation_code) = UPPER(@confirmationCode)
    LIMIT 1
  `
  const [rows] = await bigquery.query({
    query,
    params: { confirmationCode },
    useLegacySql: false,
  })

  if (!rows || rows.length === 0) return null

  const r = rows[0] as {
    source?: string
    guest_full_name?: string
    building_name?: string
    listing_nickname?: string
    check_in_date_localized?: { value: string } | string
    check_out_date_localized?: { value: string } | string
    check_in?: { value: string } | string
    check_out?: { value: string } | string
    nights_count?: number | string
    reservation_id?: string
    conversation_id?: string
    ota_reservation_id?: string
    guest_id?: string
  }

  const toIso = (v: unknown): string | null => {
    if (!v) return null
    if (typeof v === 'string') return new Date(v).toISOString()
    if (typeof v === 'object' && v !== null && 'value' in v) return new Date((v as { value: string }).value).toISOString()
    return null
  }

  return {
    source:           mapOta(r.source),
    guestName:        r.guest_full_name ?? null,
    guestPhone:       null,
    property:         r.building_name ?? null,
    unit:             r.listing_nickname ?? null,
    checkinDate:      toIso(r.check_in_date_localized),
    checkoutDate:     toIso(r.check_out_date_localized),
    checkinAt:        toIso(r.check_in),
    checkoutAt:       toIso(r.check_out),
    nightsCount:      r.nights_count != null ? Number(r.nights_count) : null,
    reservationId:    r.reservation_id ?? null,
    conversationId:   r.conversation_id ?? null,
    otaReservationId: r.ota_reservation_id ?? null,
    guestId:          r.guest_id ?? null,
  }
}
