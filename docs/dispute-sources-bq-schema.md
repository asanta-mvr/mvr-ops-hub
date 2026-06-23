# Dispute Tool — BigQuery source schemas & join map

Sanitized output of `scripts/inspect-dispute-sources.ts` (column names + JSON-payload
field shapes only; no guest data). Powers the Dispute Tool reservation-code lookup
(booking metadata + guest conversation + review).

## Join map

```
confirmation_code
   │  ops.ops_reservations  (UPPER(confirmation_code) = UPPER(@code))
   ▼
   ├─ reservation_id, ota_reservation_id, guest_id, conversation_id
   ├─ source, guest_full_name, guest_email
   ├─ building_name, listing_nickname, check_in_date_localized, check_out_date_localized
   │
   ├─ conversation_id ──► guesty.conversation_posts
   │      WHERE JSON_VALUE(json_payload,'$.conversationId') = @conversation_id
   │      ORDER BY JSON_VALUE(json_payload,'$.createdAt')
   │      → transcript (body + createdAt + module.type)
   │
   └─ reservation_id ───► ops.ops_reviews_processed  (reservation_id = @reservation_id)
          → combined_review_text + per-channel ratings
```

## `ops.ops_reservations` (lookup root; ~73k rows)

Join keys: `confirmation_code` (lookup input), `reservation_id` (→ reviews),
`conversation_id` (→ conversation_posts), `ota_reservation_id`, `guest_id`, `listing_id`.
Useful: `source`, `guest_full_name`, `guest_email`, `building_name`, `listing_nickname`,
`check_in_date_localized` (DATE), `check_out_date_localized` (DATE), `status`.

> The existing `lookupReservation` selects only a subset; it must be extended to also
> return `reservation_id` + `conversation_id` for the conversation/review joins.

## `guesty.conversation_posts` (~609k rows)

Columns: `id`, `conversation_post_id`, `json_payload JSON`, `_data_collected_at`.
`json_payload` fields:
- `_id` — post id
- `conversationId` — **join key** (= `ops_reservations.conversation_id`)
- `body` — message text (HTML/plain; may include templated host text)
- `createdAt` — ISO timestamp (order by this)
- `module.type` — channel (e.g. email/sms/airbnb2/homeaway2/expedia); `module.{to,cc,bcc}` arrays
- `sentBy` — **direction signal**: `guest` | `host` | `log` (system event). Powers the
  inbox view (guest → left, host → right, log → centered note).
- `userName` — host agent display name on manual host messages (null otherwise)
- `isAutomatic` — `"true"` on workflow/automated host messages (e.g. "Guesty Workflow")
- `attachments` — array

> An earlier revision of this doc claimed there was no sender/direction field — that
> was wrong: `sentBy` (+ `userName`/`isAutomatic`) is present and is what
> `fetchConversationMessages` (lib/disputes/bq.ts) uses to build the inbox. The flat
> `fetchConversation` transcript still labels by channel + timestamp only.
> (`conversations.json_payload.meta.guest` has guest metadata but we already get that
> from `ops_reservations`, so the conversations table stays unused.)

## `guesty.conversations` (~56k rows) — not needed for the transcript

Columns: `id`, `conversation_id`, `json_payload JSON`, `_data_collected_at`.
`json_payload`: `_id` (= conversation id), `meta.guest{fullName,email,phone}`,
`meta.reservations[]{confirmationCode,checkIn,checkOut,source,status,listing}`,
`state.lastMessage{body,date}`. Kept for reference only.

## `ops.ops_reviews_processed` (~10k rows)

Join key: `reservation_id` (= `ops_reservations.reservation_id`); also
`external_reservation_id` (= `ota_reservation_id`), `channel_id`.
Content: `combined_review_text` (review body), `created_at`, `check_out_date_localized`.
Ratings (FLOAT64, per channel — coalesce by source):
- Airbnb: `airbnb_overall_rating` (+ value/location/accuracy/cleanliness/checkin/communication)
- Vrbo: `vrbo_overall_rating` (+ sub-ratings)
- Booking: `bdc_review_rating_fixed` (prefer the `_fixed` variant; + sub-ratings)

> `reva_reviews.reviews` (documented in `docs/reviews-bq-schema.md`) remains the raw
> per-OTA review feed; `ops_reviews_processed` is the cleaned, reservation-keyed table
> the Dispute Tool prefers. Fall back to `reva_reviews.reviews` only if needed.
