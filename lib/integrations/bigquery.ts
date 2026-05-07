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
  checkinDate:  string | null // ISO string
  checkoutDate: string | null
}

export async function lookupReservation(confirmationCode: string): Promise<ReservationLookup | null> {
  const query = `
    SELECT source, guest_full_name, building_name, listing_nickname, check_in_date_localized, check_out_date_localized
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
  }

  const toIso = (v: unknown): string | null => {
    if (!v) return null
    if (typeof v === 'string') return new Date(v).toISOString()
    if (typeof v === 'object' && v !== null && 'value' in v) return new Date((v as { value: string }).value).toISOString()
    return null
  }

  return {
    source:       mapOta(r.source),
    guestName:    r.guest_full_name ?? null,
    guestPhone:   null,
    property:     r.building_name ?? null,
    unit:         r.listing_nickname ?? null,
    checkinDate:  toIso(r.check_in_date_localized),
    checkoutDate: toIso(r.check_out_date_localized),
  }
}
