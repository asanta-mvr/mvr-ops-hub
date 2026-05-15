// One-shot diagnostic: prints the schema + 5-row sample of
// miami-vr-data.reva_reviews.reviews so we can decide the join key
// to ops-hub Postgres (Listing/Unit/Building) before building the module.
//
// Run from project root with BQ credentials loaded:
//   tsx --env-file=.env.local scripts/discover-reviews-schema.ts > docs/reviews-bq-schema.md
//
// Requires BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY in env.
import { getBigQueryClient } from '@/lib/integrations/bigquery'

const PROJECT = 'miami-vr-data'
const DATASET = 'reva_reviews'
const TABLE   = 'reviews'

interface ColumnRow {
  column_name: string
  data_type:   string
  is_nullable: string
}

async function main(): Promise<void> {
  const bq = getBigQueryClient()

  const schemaQuery = `
    SELECT column_name, data_type, is_nullable
    FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
    WHERE table_name = '${TABLE}'
    ORDER BY ordinal_position
  `

  const [columnRows] = await bq.query({ query: schemaQuery, useLegacySql: false })
  const columns = columnRows as ColumnRow[]

  const [countRows] = await bq.query({
    query: `SELECT COUNT(*) AS n FROM \`${PROJECT}.${DATASET}.${TABLE}\``,
    useLegacySql: false,
  })
  const totalRows = (countRows[0] as { n: number | string }).n

  const sampleQuery = `
    SELECT *
    FROM \`${PROJECT}.${DATASET}.${TABLE}\`
    LIMIT 5
  `
  const [sampleRows] = await bq.query({ query: sampleQuery, useLegacySql: false })

  // Markdown to stdout — pipe into docs/reviews-bq-schema.md.
  console.log('# Reviews BigQuery Schema')
  console.log('')
  console.log(`Source table: \`${PROJECT}.${DATASET}.${TABLE}\``)
  console.log(`Total rows:   ${totalRows}`)
  console.log(`Generated:    ${new Date().toISOString()}`)
  console.log('')
  console.log('## Columns')
  console.log('')
  console.log('| # | column_name | data_type | nullable |')
  console.log('|---|---|---|---|')
  columns.forEach((c, i) => {
    console.log(`| ${i + 1} | \`${c.column_name}\` | \`${c.data_type}\` | ${c.is_nullable} |`)
  })

  console.log('')
  console.log('## Sample rows (5)')
  console.log('')
  console.log('```json')
  console.log(JSON.stringify(sampleRows, null, 2))
  console.log('```')

  console.log('')
  console.log('## Join-key candidates')
  console.log('')
  const lower = columns.map((c) => c.column_name.toLowerCase())
  const interesting = lower.filter((n) =>
    /listing|property|building|reservation|confirmation|external|review_id|id$|ota|source|channel|rating|score|created|stay|guest/i.test(n)
  )
  for (const name of interesting) {
    console.log(`- \`${name}\``)
  }
  console.log('')
  console.log('## Decision (fill in after inspecting above)')
  console.log('')
  console.log('- **OTA column**: TBD')
  console.log('- **Listing/property identifier**: TBD')
  console.log('- **Unique review identifier (`externalReviewId`)**: TBD')
  console.log('- **Rating column**: TBD')
  console.log('- **Review date column**: TBD')
  console.log('- **Join strategy to ops-hub `Listing`**: TBD (per-OTA listing id vs. confirmation code)')
}

main()
  .catch((e) => {
    console.error('Discovery failed:', e)
    process.exit(1)
  })
