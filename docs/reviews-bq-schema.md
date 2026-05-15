# Reviews BigQuery Schema

Source table: `miami-vr-data.reva_reviews.reviews`
Total rows:   19489
Generated:    2026-05-15T16:24:19.325Z

## Columns

| # | column_name | data_type | nullable |
|---|---|---|---|
| 1 | `id` | `STRING` | NO |
| 2 | `company_id` | `STRING` | YES |
| 3 | `unit_id` | `STRING` | YES |
| 4 | `unit_name` | `STRING` | YES |
| 5 | `unit_provider_id` | `STRING` | YES |
| 6 | `review_of` | `STRING` | YES |
| 7 | `rating` | `INT64` | YES |
| 8 | `date` | `DATE` | YES |
| 9 | `updated_at` | `TIMESTAMP` | YES |
| 10 | `title` | `STRING` | YES |
| 11 | `description` | `STRING` | YES |
| 12 | `channel_name` | `STRING` | YES |
| 13 | `guest_name` | `STRING` | YES |
| 14 | `host_response` | `BOOL` | YES |
| 15 | `host_response_text` | `STRING` | YES |
| 16 | `positive_tags` | `ARRAY<STRING>` | NO |
| 17 | `negative_tags` | `ARRAY<STRING>` | NO |
| 18 | `reservation_id` | `STRING` | YES |
| 19 | `timing` | `STRING` | YES |
| 20 | `display_on_website` | `BOOL` | YES |
| 21 | `etl_loaded_at` | `TIMESTAMP` | YES |

## Sample rows (5)

```json
[
  {
    "id": "17f18fcd-964f-4b0c-a601-439dd0f08282",
    "company_id": "896e5a10-315f-41b3-bf98-c727f582f9ba",
    "unit_id": "deb79202-ff1e-46a5-b9f9-e647d1cf06ed",
    "unit_name": "Icon 4407",
    "unit_provider_id": "6806b08a1c0052001397ae2f",
    "review_of": "Unit",
    "rating": 5,
    "date": {
      "value": "2025-04-03"
    },
    "updated_at": {
      "value": "2026-04-23T19:15:50.608Z"
    },
    "title": null,
    "description": "Excellent stay. Thank you!",
    "channel_name": "Airbnb",
    "guest_name": "Edward",
    "host_response": true,
    "host_response_text": "Thanks, Edward! We're so happy you enjoyed your stay. Hope to welcome you back soon!",
    "positive_tags": [],
    "negative_tags": [],
    "reservation_id": null,
    "timing": "end_of_stay",
    "display_on_website": true,
    "etl_loaded_at": {
      "value": "2026-05-13T18:49:17.300224000Z"
    }
  },
  {
    "id": "84cd886a-9853-4c98-a936-2e881a286185",
    "company_id": "896e5a10-315f-41b3-bf98-c727f582f9ba",
    "unit_id": "deb79202-ff1e-46a5-b9f9-e647d1cf06ed",
    "unit_name": "Icon 4407",
    "unit_provider_id": "6806b08a1c0052001397ae2f",
    "review_of": "Unit",
    "rating": 4,
    "date": {
      "value": "2025-01-11"
    },
    "updated_at": {
      "value": "2026-04-23T19:15:51.007Z"
    },
    "title": null,
    "description": "I had a great stay at this property! The location was perfect, making it easy to explore the area. The condo offered excellent amenities and was beautifully decorated, creating a cozy and inviting atmosphere. The hosts were very responsive, addressing any issues promptly. While there were a couple of mishaps during my stay, they were resolved professionally, which I really appreciated. Overall, a wonderful experience, and I would definitely recommend this property!",
    "channel_name": "Airbnb",
    "guest_name": "Catherine",
    "host_response": true,
    "host_response_text": "Thank you very much for your kind review, Catherine! We are very happy to hear you enjoyed the great amenities, awesome location and overall stay with us. It was a pleasure hosting you!",
    "positive_tags": [
      "Manager Communication",
      "Great location",
      "Design"
    ],
    "negative_tags": [],
    "reservation_id": null,
    "timing": "end_of_stay",
    "display_on_website": false,
    "etl_loaded_at": {
      "value": "2026-05-13T18:49:17.300224000Z"
    }
  },
  {
    "id": "bb59435d-3b69-45b4-8603-2565fae15648",
    "company_id": "896e5a10-315f-41b3-bf98-c727f582f9ba",
    "unit_id": "deb79202-ff1e-46a5-b9f9-e647d1cf06ed",
    "unit_name": "Icon 4407",
    "unit_provider_id": "6806b08a1c0052001397ae2f",
    "review_of": "Unit",
    "rating": 5,
    "date": {
      "value": "2024-09-22"
    },
    "updated_at": {
      "value": "2026-04-23T19:15:52.172Z"
    },
    "title": null,
    "description": "Great location. Great apartment. Everything is as described / shown in pictures",
    "channel_name": "Airbnb",
    "guest_name": "Brandon",
    "host_response": true,
    "host_response_text": "Thank you very much, Brandon! We are very happy to hear you enjoyed the wonderful location! It was a pleasure hosting you!",
    "positive_tags": [
      "Great location",
      "As Advertised"
    ],
    "negative_tags": [],
    "reservation_id": null,
    "timing": "end_of_stay",
    "display_on_website": true,
    "etl_loaded_at": {
      "value": "2026-05-13T18:49:17.300224000Z"
    }
  },
  {
    "id": "82e82537-4f50-40ef-9b5b-f309ee8a06f3",
    "company_id": "896e5a10-315f-41b3-bf98-c727f582f9ba",
    "unit_id": "deb79202-ff1e-46a5-b9f9-e647d1cf06ed",
    "unit_name": "Icon 4407",
    "unit_provider_id": "6806b08a1c0052001397ae2f",
    "review_of": "Unit",
    "rating": 5,
    "date": {
      "value": "2024-11-10"
    },
    "updated_at": {
      "value": "2026-04-23T19:15:52.174Z"
    },
    "title": null,
    "description": "A PERFECT stay.",
    "channel_name": "Airbnb",
    "guest_name": "Zachary",
    "host_response": true,
    "host_response_text": "Thanks so much, Zachary! It was an absolute pleasure hosting you!",
    "positive_tags": [],
    "negative_tags": [],
    "reservation_id": null,
    "timing": "end_of_stay",
    "display_on_website": true,
    "etl_loaded_at": {
      "value": "2026-05-13T18:49:17.300224000Z"
    }
  },
  {
    "id": "6aaec0a2-f106-42bf-91d4-88f967391999",
    "company_id": "896e5a10-315f-41b3-bf98-c727f582f9ba",
    "unit_id": "deb79202-ff1e-46a5-b9f9-e647d1cf06ed",
    "unit_name": "Icon 4407",
    "unit_provider_id": "6806b08a1c0052001397ae2f",
    "review_of": "Unit",
    "rating": 5,
    "date": {
      "value": "2024-02-15"
    },
    "updated_at": {
      "value": "2026-04-23T19:15:52.741Z"
    },
    "title": null,
    "description": "Great stay",
    "channel_name": "Airbnb",
    "guest_name": "Victor",
    "host_response": true,
    "host_response_text": "We are very happy you enjoyed your stay with us Victor! It was a pleasure hosting you!",
    "positive_tags": [],
    "negative_tags": [],
    "reservation_id": null,
    "timing": "end_of_stay",
    "display_on_website": true,
    "etl_loaded_at": {
      "value": "2026-05-13T18:49:17.300224000Z"
    }
  }
]
```

## Join-key candidates

- `id`
- `company_id`
- `unit_id`
- `unit_provider_id`
- `rating`
- `channel_name`
- `guest_name`
- `reservation_id`

## Decision — Phase 1

Resolved 2026-05-15. Anchors every other Task in the Reviews module plan.

| Concept | BQ column | Notes |
|---|---|---|
| Unique review id (→ `ReviewAction.externalReviewId`) | `id` (STRING, NOT NULL, UUIDv4) | Stable across re-loads; safe as the action key. |
| OTA / channel | `channel_name` (STRING, e.g. `"Airbnb"`) | Mapped to `OtaSource` enum via the existing `mapOta()` helper in [lib/integrations/bigquery.ts](lib/integrations/bigquery.ts). `"Airbnb"`, `"Booking.com"`, `"Vrbo"`, `"Expedia"`, `"Vacasa"`, else `"other"`. |
| Rating | `rating` (INT64, nullable) | Scale 1–5 in the samples. Filter pills `<3` and `<4` are exclusive — i.e. `rating IS NOT NULL AND rating < 3/4`. |
| Review date | `date` (DATE) | Returned by `@google-cloud/bigquery` as `{ value: 'YYYY-MM-DD' }` — unwrap in `lib/reviews/bq.ts`. |
| Last update | `updated_at` (TIMESTAMP) | Use for "recently updated" sorting if needed. |
| Body | `description` (STRING) | The review text. |
| Title | `title` (STRING, often null on Airbnb) | Optional. |
| Host reply | `host_response` (BOOL) + `host_response_text` (STRING) | Shown in detail drawer. |
| Tags | `positive_tags`, `negative_tags` (ARRAY<STRING>, never null per schema) | Use as colored chips. |
| Guest | `guest_name` (STRING) | Display only. |
| Unit (BQ side) | `unit_name` (STRING, e.g. `"Icon 4407"`) | Human-readable. Pattern observed: `"<Building> <UnitNumber>"`. See join strategy below. |
| Provider id | `unit_provider_id` (STRING, e.g. `"6806b08a1c0052001397ae2f"`) | Hostfully/Revaboard provider id. Phase 2 hook for a hard FK. |
| Internal unit uuid | `unit_id` (STRING UUID) | Revaboard-internal — unrelated to ops-hub `Unit.id` cuids. |
| Display flag (Revaboard) | `display_on_website` (BOOL) | Out of scope here; informational. |
| ETL freshness | `etl_loaded_at` (TIMESTAMP) | Surface in the page header (`Last sync: …`). |
| Reservation | `reservation_id` (STRING, nullable) | Often null on Revaboard import — do NOT rely on it for joins. |
| Type | `review_of` (STRING, e.g. `"Unit"`, `"Guest"`) | Filter to `review_of = 'Unit'` in `fetchReviewsList()` — guest reviews are not what ops-hub cares about. |

### Join strategy to ops-hub Postgres — **soft string match by building/unit name**

The reviews table comes from Revaboard, which does not carry ops-hub's `cuid` `Unit.id`. There is **no shared hard FK today**. Phase 1 takes a pragmatic path:

1. **No hard FK migration in this phase.** `ReviewAction` keys solely on `(otaSource, externalReviewId)` — the BQ `id` is sufficient.
2. **Building filter** in `lib/reviews/bq.ts` is performed BQ-side with `WHERE unit_name LIKE @buildingPrefix || ' %'` (e.g. `"Icon %"`). The filter-options endpoint pulls `DISTINCT` building prefixes by `SPLIT(unit_name, ' ')[OFFSET(0)]` so the dropdown stays in sync with whatever Revaboard publishes — no manual mapping table.
3. **Unit hover-card** (Phase 2) will do a best-effort lookup against `Unit.number` + `Building.name` matched on the parsed `unit_name`. Out of scope for Task 6.
4. **Phase 2 hard join (deferred)**: when needed, add `Listing.revaboardUnitProviderId String? @unique` (backfill from `unit_provider_id`) — that gives a clean FK without touching this phase.

### Effective table reads

All queries SELECT a stable projection:

```
SELECT id, channel_name, rating, date, updated_at, title, description,
       guest_name, host_response, host_response_text,
       positive_tags, negative_tags, unit_name, unit_provider_id,
       review_of, timing, display_on_website, etl_loaded_at
FROM `miami-vr-data.reva_reviews.reviews`
WHERE review_of = 'Unit'
```

Filters and pagination apply on top of that base CTE.

