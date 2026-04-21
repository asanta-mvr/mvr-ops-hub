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

const OTA_MAP: Record<string, OtaSource> = {
  airbnb:      'airbnb',
  booking:     'booking',
  'booking.com': 'booking',
  vrbo:        'vrbo',
  expedia:     'expedia',
  vacasa:      'vacasa',
}

function mapOta(raw: string | null | undefined): OtaSource {
  if (!raw) return 'other'
  return OTA_MAP[raw.toLowerCase()] ?? 'other'
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
    SELECT ota, guest_name, guest_phone, property, unit, checkin, checkout
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
    ota?: string
    guest_name?: string
    guest_phone?: string
    property?: string
    unit?: string
    checkin?: { value: string } | string
    checkout?: { value: string } | string
  }

  const toIso = (v: unknown): string | null => {
    if (!v) return null
    if (typeof v === 'string') return new Date(v).toISOString()
    if (typeof v === 'object' && v !== null && 'value' in v) return new Date((v as { value: string }).value).toISOString()
    return null
  }

  return {
    source:       mapOta(r.ota),
    guestName:    r.guest_name ?? null,
    guestPhone:   r.guest_phone ?? null,
    property:     r.property ?? null,
    unit:         r.unit ?? null,
    checkinDate:  toIso(r.checkin),
    checkoutDate: toIso(r.checkout),
  }
}
