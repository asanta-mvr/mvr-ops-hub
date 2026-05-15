// One-shot diagnostic: shows where the Reviews-page row counts actually come
// from. Run when "All years" appears to show fewer rows than expected.
//
//   tsx --env-file=.env.local scripts/diagnose-reviews-counts.ts
import { getBigQueryClient } from '@/lib/integrations/bigquery'

const TABLE = '`miami-vr-data.reva_reviews.reviews`'

async function main(): Promise<void> {
  const bq = getBigQueryClient()

  const [[total]] = await bq.query({
    query: `SELECT COUNT(*) AS n FROM ${TABLE}`,
    useLegacySql: false,
  })
  const [byReviewOf] = await bq.query({
    query: `
      SELECT IFNULL(review_of, '(null)') AS review_of, COUNT(*) AS n
      FROM ${TABLE}
      GROUP BY review_of
      ORDER BY n DESC
    `,
    useLegacySql: false,
  })
  const [byYear] = await bq.query({
    query: `
      SELECT EXTRACT(YEAR FROM date) AS y, COUNT(*) AS n
      FROM ${TABLE}
      WHERE review_of = 'Unit'
      GROUP BY y
      ORDER BY y DESC
    `,
    useLegacySql: false,
  })
  const [byYearAll] = await bq.query({
    query: `
      SELECT EXTRACT(YEAR FROM date) AS y, COUNT(*) AS n
      FROM ${TABLE}
      GROUP BY y
      ORDER BY y DESC
    `,
    useLegacySql: false,
  })
  const [[unitTotal]] = await bq.query({
    query: `SELECT COUNT(*) AS n FROM ${TABLE} WHERE review_of = 'Unit'`,
    useLegacySql: false,
  })
  const [[nullDate]] = await bq.query({
    query: `SELECT COUNT(*) AS n FROM ${TABLE} WHERE review_of = 'Unit' AND date IS NULL`,
    useLegacySql: false,
  })

  console.log('=== TOTAL ROWS ===')
  console.log(`Grand total:               ${(total as { n: number | string }).n}`)
  console.log(`review_of = 'Unit':        ${(unitTotal as { n: number | string }).n}`)
  console.log(`Unit + date IS NULL:       ${(nullDate as { n: number | string }).n}`)

  console.log('\n=== BY review_of ===')
  for (const r of byReviewOf as Array<{ review_of: string; n: number | string }>) {
    console.log(`  ${String(r.n).padStart(7)}  ${r.review_of}`)
  }

  console.log("\n=== BY YEAR (review_of = 'Unit') ===")
  for (const r of byYear as Array<{ y: number; n: number | string }>) {
    console.log(`  ${String(r.n).padStart(7)}  ${r.y ?? '(null)'}`)
  }

  console.log('\n=== BY YEAR (ALL review_of) ===')
  for (const r of byYearAll as Array<{ y: number; n: number | string }>) {
    console.log(`  ${String(r.n).padStart(7)}  ${r.y ?? '(null)'}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
