// Helpers to extract human-readable fields from the Stripe `raw` JSON.
// Used by both the table row and the expanded detail row so they stay in sync.

function get(raw: unknown, path: string[]): unknown {
  let cur: unknown = raw
  for (const k of path) {
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'string') return v.trim() === '' ? null : v.trim()
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return null
}

export interface ChargeMeta {
  guestName: string | null
  email: string | null
  confirmationCode: string | null
  property: string | null
  chargeType: string | null
  cardBrand: string | null
  cardLast4: string | null
  cardCountry: string | null
  cardFunding: string | null
  sellerMessage: string | null
  networkStatus: string | null
}

export function extractChargeMeta(raw: unknown): ChargeMeta {
  const metadata = (get(raw, ['metadata']) as Record<string, unknown> | undefined) ?? {}
  const billing = (get(raw, ['billing_details']) as Record<string, unknown> | undefined) ?? {}
  const card = (get(raw, ['payment_method_details', 'card']) as Record<string, unknown> | undefined) ?? {}
  const outcome = (get(raw, ['outcome']) as Record<string, unknown> | undefined) ?? {}

  const firstName = str(metadata['First Name'])
  const lastName = str(metadata['Last Name'])
  const composed = [firstName, lastName].filter(Boolean).join(' ').trim()
  const guestName = composed || str(billing.name)

  const confirmationCode =
    str(metadata.Reservation) ||
    str(metadata.reservation_id) ||
    str(metadata.booking_id) ||
    str(metadata['Confirmation Code'])

  const property =
    str(metadata['Property Nickname']) ||
    str(metadata.property) ||
    str(metadata['Property Name'])

  const chargeType =
    str(metadata['Charge Type']) || str(metadata.charge_type) || str(metadata.type)

  return {
    guestName,
    email: str(billing.email),
    confirmationCode,
    property,
    chargeType,
    cardBrand: str(card.brand),
    cardLast4: str(card.last4),
    cardCountry: str(card.country),
    cardFunding: str(card.funding),
    sellerMessage: str(outcome.seller_message),
    networkStatus: str(outcome.network_status),
  }
}
