// Human-readable explanations for the Stripe decline / outcome reasons that
// we encounter in `risk_agent.transactions.outcome_reason`. Source: Stripe's
// published list of decline_code values plus Radar outcomes. Reasons not
// listed fall back to the snake_case label converted to Title Case.
//
// Keep this map flat — keys are Stripe-style snake_case codes.

export const DECLINE_REASON_DESCRIPTIONS: Record<string, string> = {
  // Risk / Radar
  highest_risk_level:
    "Stripe Radar flagged the charge as extremely high risk — usually fraud signals. The card may be valid but the transaction context (IP, device, history) raised the alarm.",
  elevated_risk_level:
    'Radar flagged the charge as elevated risk. Not auto-blocked but worth reviewing.',
  rule:
    'A Radar rule (custom or built-in) blocked the charge based on patterns the merchant defined.',

  // Bank-side declines
  do_not_honor:
    'The bank declined without giving a specific reason — typically a soft fraud signal or limit issue. Tell the customer to contact their issuer.',
  generic_decline:
    'Generic card decline. The bank rejected the charge without details. Customer should contact their issuer.',
  card_declined:
    'Same as generic decline — the bank returned a non-specific "no". Different processor wording.',
  insufficient_funds:
    "The cardholder's account didn't have enough funds to cover the charge.",
  card_velocity_exceeded:
    'Too many failed attempts on this card in a short window. Bank temporarily blocked further tries.',
  try_again_later:
    'Transient bank-side issue — retrying minutes later usually works.',
  transaction_not_allowed:
    'The card type or the merchant category code is not allowed for this transaction (e.g., prepaid cards on recurring charges).',
  previously_declined_do_not_retry:
    'Bank explicitly instructed Stripe not to retry. Often used after a hard fraud decline.',

  // Authentication
  payment_intent_authentication_failure:
    '3D Secure (SCA) authentication failed — customer either failed the challenge or abandoned it.',
  authentication_required:
    'The bank required SCA / 3DS but it was not completed on this attempt.',

  // Card data errors
  incorrect_cvc: "The CVC (3-4 digit security code) didn't match what the bank has on file.",
  invalid_cvc: 'The CVC was malformed (wrong length or non-numeric).',
  incorrect_number: 'The card number is invalid.',
  invalid_number: 'The card number failed the basic checksum validation.',
  incorrect_zip: "The billing ZIP didn't match the bank's record.",
  invalid_account: 'The account associated with the card is closed or invalid.',
  invalid_amount: 'The charge amount is outside what the card allows (often zero or over a limit).',
  expired_card: 'The card has passed its expiration date.',

  // Card lost / stolen
  lost_card: 'The card was reported lost. Bank will not authorize.',
  stolen_card: 'The card was reported stolen. Bank will not authorize.',
  pickup_card: 'The bank flagged the card for confiscation — likely fraud.',
  restricted_card: 'The card has been restricted by the issuer.',
  security_violation: 'The bank suspects a security violation on the account.',

  // Processing / transient
  processing_error:
    "Stripe or the card network had a transient error. Retry on the customer's side usually clears.",
  reenter_transaction:
    'The bank wants the transaction re-entered. Usually a transient communication issue.',
  call_issuer: 'The bank wants the customer to call them before authorizing.',
  service_not_allowed: 'The transaction type is not allowed for this card (e.g., crypto purchases on a restricted card).',

  // Aggregate buckets we synthesize ourselves
  '(unknown)':
    "We didn't get a specific reason from Stripe — typically a `payment_intent.payment_failed` event before the bank-side outcome was attached. The charge still failed.",
  '(other)':
    'Long-tail of less common decline codes grouped together so the top buckets stay readable. Expand the filter to see the underlying charges.',
}

export function humanizeReason(code: string): string {
  if (code === '(unknown)') return 'Unknown reason'
  if (code === '(other)') return 'Other reasons'
  return code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function describeReason(code: string): string {
  const explicit = DECLINE_REASON_DESCRIPTIONS[code]
  if (explicit) return explicit
  return 'No description available for this Stripe decline code.'
}
