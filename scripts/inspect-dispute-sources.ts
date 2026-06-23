// One-shot diagnostic for the Dispute Tool reservation-lookup feature.
// Prints schema + a tiny sample for the BigQuery tables that power the booking
// lookup, guest-conversation pull, and review pull — so we can lock column names
// and the join keys (reservation → conversation → review) before writing queries.
//
// Run from project root with BQ credentials loaded:
//   tsx --env-file=.env.local scripts/inspect-dispute-sources.ts
//
// NOTE: sample output may contain guest PII — it is printed to stdout only for
// inspection. Do NOT pipe it into a committed doc verbatim; author a sanitized
// schema doc from the column lists instead.
//
// Requires BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY in env.
import { getBigQueryClient } from '@/lib/integrations/bigquery'

const PROJECT = 'miami-vr-data'

const TARGETS: Array<{ dataset: string; table: string }> = [
  { dataset: 'ops', table: 'ops_reservations' },
  { dataset: 'guesty', table: 'conversations' },
  { dataset: 'guesty', table: 'conversation_posts' },
  { dataset: 'ops', table: 'ops_reviews_processed' },
  { dataset: 'ops', table: 'gaps' },
]

interface ColumnRow {
  column_name: string
  data_type: string
  is_nullable: string
}

// Redacts string leaves so we can see JSON *shape* without exposing guest PII.
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '<deep>'
  if (typeof value === 'string') return `<str:${value.length}>`
  if (Array.isArray(value)) return value.slice(0, 2).map((v) => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = redact(v, depth + 1)
    return out
  }
  return value
}

const JOIN_HINT =
  /reservation|confirmation|conversation|guest|listing|building|unit|external|account|_id$|^id$|channel|source|ota|review|rating|body|text|message|content|created|date|sender|incoming|direction|module/i

async function inspect(dataset: string, table: string): Promise<void> {
  const bq = getBigQueryClient()
  const fqtn = `${PROJECT}.${dataset}.${table}`
  console.log('\n' + '='.repeat(80))
  console.log(`TABLE: ${fqtn}`)
  console.log('='.repeat(80))

  try {
    const [columnRows] = await bq.query({
      query: `
        SELECT column_name, data_type, is_nullable
        FROM \`${PROJECT}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE table_name = '${table}'
        ORDER BY ordinal_position
      `,
      useLegacySql: false,
    })
    const columns = columnRows as ColumnRow[]

    if (!columns.length) {
      console.log('  (no columns returned — table may not exist or name differs)')
      return
    }

    console.log('\nColumns:')
    for (const c of columns) {
      console.log(`  - ${c.column_name} : ${c.data_type}${c.is_nullable === 'YES' ? ' (nullable)' : ''}`)
    }

    const joinables = columns.map((c) => c.column_name).filter((n) => JOIN_HINT.test(n))
    console.log('\nJoin-key / content candidates:')
    console.log('  ' + (joinables.join(', ') || '(none matched)'))

    const [countRows] = await bq.query({
      query: `SELECT COUNT(*) AS n FROM \`${fqtn}\``,
      useLegacySql: false,
    })
    console.log(`\nRow count: ${(countRows[0] as { n: number | string }).n}`)

    const [sampleRows] = await bq.query({
      query: `SELECT * FROM \`${fqtn}\` LIMIT 3`,
      useLegacySql: false,
    })
    // Truncate long string values so message bodies don't flood / over-expose.
    const trimmed = (sampleRows as Record<string, unknown>[]).map((row) => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(row)) {
        out[k] = typeof v === 'string' && v.length > 120 ? v.slice(0, 120) + '…' : v
      }
      return out
    })
    console.log('\nSample (3 rows, string values truncated to 120 chars):')
    console.log(JSON.stringify(trimmed, null, 2))

    // For tables whose content lives in a JSON column, dump the redacted shape
    // of the first row so we can see the internal keys (body, sender, etc.).
    if (columns.some((c) => c.column_name === 'json_payload') && sampleRows.length) {
      const raw = (sampleRows[0] as Record<string, unknown>).json_payload
      const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
      console.log('\njson_payload — top-level keys:')
      console.log('  ' + Object.keys(payload as object).join(', '))
      console.log('\njson_payload — redacted shape (strings → "<str:N>"):')
      console.log(JSON.stringify(redact(payload), null, 2))
    }
  } catch (e) {
    console.log(`  ERROR inspecting ${fqtn}: ${(e as Error).message}`)
  }
}

// Scans for money/payout columns across whole datasets — payout is not on
// ops_reservations, so we need to locate the source table for ADR.
async function scanMoneyColumns(dataset: string): Promise<void> {
  const bq = getBigQueryClient()
  console.log('\n' + '#'.repeat(80))
  console.log(`MONEY-COLUMN SCAN: ${PROJECT}.${dataset}`)
  console.log('#'.repeat(80))
  try {
    const [rows] = await bq.query({
      query: `
        SELECT table_name, column_name, data_type
        FROM \`${PROJECT}.${dataset}.INFORMATION_SCHEMA.COLUMNS\`
        WHERE REGEXP_CONTAINS(LOWER(column_name),
          r'payout|revenue|price|amount|fare|total|payment|net|gross|nightly|adr|money|paid|host_')
        ORDER BY table_name, ordinal_position
      `,
      useLegacySql: false,
    })
    for (const r of rows as Array<{ table_name: string; column_name: string; data_type: string }>) {
      console.log(`  ${r.table_name}.${r.column_name} : ${r.data_type}`)
    }
  } catch (e) {
    console.log(`  ERROR scanning ${dataset}: ${(e as Error).message}`)
  }
}

// Validates the ops.gaps payout/ADR aggregation against one real reservation.
async function financialsSmokeTest(): Promise<void> {
  const bq = getBigQueryClient()
  console.log('\n' + '#'.repeat(80))
  console.log('FINANCIALS SMOKE TEST (ops.gaps aggregation)')
  console.log('#'.repeat(80))
  try {
    const [rows] = await bq.query({
      query: `
        WITH sample AS (
          SELECT reservation_id
          FROM \`${PROJECT}.ops.gaps\`
          WHERE reservation_id IS NOT NULL AND fare_accommodation IS NOT NULL
          LIMIT 1
        )
        SELECT
          SUM(SAFE_CAST(g.fare_accommodation AS FLOAT64)) AS payout,
          AVG(g.rental_adr)                               AS avg_adr,
          COUNT(*)                                        AS gap_nights
        FROM \`${PROJECT}.ops.gaps\` g
        JOIN sample s ON g.reservation_id = s.reservation_id
      `,
      useLegacySql: false,
    })
    console.log('  result:', JSON.stringify(rows[0]))
  } catch (e) {
    console.log(`  ERROR: ${(e as Error).message}`)
  }
}

async function main(): Promise<void> {
  for (const t of TARGETS) {
    await inspect(t.dataset, t.table)
  }
  await scanMoneyColumns('ops')
  await scanMoneyColumns('guesty')
  await financialsSmokeTest()
}

main()
  .catch((e) => {
    console.error('Discovery failed:', e)
    process.exit(1)
  })
