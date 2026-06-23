// Phase 0 discovery for the Maintenance Report module.
//
// Dumps schema + row counts + 5-row samples for every `parsed_breezeway_*`
// table under miami-vr-data.etl_stage so we can decide:
//   - whether explicit material_cost / labor_cost / supplies_cost columns
//     exist (vs. needing a heuristic)
//   - whether a task_type (Preventive/Corrective) column exists vs. needing
//     classification from tags / subdepartment / title
//   - whether tasks have a scheduled_date / due_date for the preventive
//     cronograma
//   - what freshness signal we have (etl_loaded_at or similar)
//   - whether parsed_breezeway_properties.name string-matches our internal
//     Unit.name (sample compare with Postgres)
//
// Run from project root with BQ credentials loaded:
//   tsx --env-file=.env.local scripts/inspect-breezeway-bq.ts > docs/maintenance-bq-schema.md
//
// Requires BQ_PROJECT_ID, BQ_CLIENT_EMAIL, BQ_PRIVATE_KEY in env.
import { getBigQueryClient } from '@/lib/integrations/bigquery'

const PROJECT = 'miami-vr-data'
const DATASET = 'etl_stage'
const TABLE_PREFIX = 'parsed_breezeway_'

interface ColumnRow {
  table_name:  string
  column_name: string
  data_type:   string
  is_nullable: string
}

interface TableMeta {
  table_name: string
  rowCount:   number | string
  columns:    ColumnRow[]
  sample:     Record<string, unknown>[]
}

function fence(s: unknown): string {
  return '`' + String(s) + '`'
}

async function main(): Promise<void> {
  const bq = getBigQueryClient()

  // 1. Discover all parsed_breezeway_* tables (don't hardcode — capture any
  //    new tables the ETL may have added since the plan was drafted).
  const [tableRows] = await bq.query({
    query: `
      SELECT table_name
      FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name LIKE '${TABLE_PREFIX}%'
      ORDER BY table_name
    `,
    useLegacySql: false,
  })
  const tableNames = (tableRows as { table_name: string }[]).map((r) => r.table_name)

  // 2. Pull all columns in one query (faster than 15 round-trips).
  const [allColumnRows] = await bq.query({
    query: `
      SELECT table_name, column_name, data_type, is_nullable
      FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name LIKE '${TABLE_PREFIX}%'
      ORDER BY table_name, ordinal_position
    `,
    useLegacySql: false,
  })
  const allColumns = allColumnRows as ColumnRow[]

  // 3. Per-table: row count + 5-row sample.
  const tables: TableMeta[] = []
  for (const t of tableNames) {
    const cols = allColumns.filter((c) => c.table_name === t)

    let rowCount: number | string = 'n/a'
    try {
      const [countRows] = await bq.query({
        query: `SELECT COUNT(*) AS n FROM \`${PROJECT}.${DATASET}.${t}\``,
        useLegacySql: false,
      })
      rowCount = (countRows[0] as { n: number | string }).n
    } catch (e) {
      rowCount = `error: ${(e as Error).message}`
    }

    let sample: Record<string, unknown>[] = []
    try {
      const [sampleRows] = await bq.query({
        query: `SELECT * FROM \`${PROJECT}.${DATASET}.${t}\` LIMIT 5`,
        useLegacySql: false,
      })
      sample = sampleRows as Record<string, unknown>[]
    } catch (e) {
      sample = [{ _error: (e as Error).message }]
    }

    tables.push({ table_name: t, rowCount, columns: cols, sample })
  }

  // 4. Targeted diagnostics for Phase 0 questions ---------------------------
  const tasksTable = `${PROJECT}.${DATASET}.parsed_breezeway_tasks`

  const tasksCols = allColumns.filter((c) => c.table_name === 'parsed_breezeway_tasks')
  const hasCol = (name: string) => tasksCols.some((c) => c.column_name.toLowerCase() === name.toLowerCase())

  const tagDistinct: Array<Record<string, unknown>> = []
  if (hasCol('task_type')) {
    try {
      const [rows] = await bq.query({
        query: `SELECT task_type, COUNT(*) AS n FROM \`${tasksTable}\` GROUP BY 1 ORDER BY n DESC LIMIT 20`,
        useLegacySql: false,
      })
      tagDistinct.push({ source: 'task_type', rows: rows as Record<string, unknown>[] })
    } catch (e) {
      tagDistinct.push({ source: 'task_type', error: (e as Error).message })
    }
  }
  if (hasCol('subdepartment')) {
    try {
      const [rows] = await bq.query({
        query: `SELECT subdepartment, COUNT(*) AS n FROM \`${tasksTable}\` GROUP BY 1 ORDER BY n DESC LIMIT 30`,
        useLegacySql: false,
      })
      tagDistinct.push({ source: 'subdepartment', rows: rows as Record<string, unknown>[] })
    } catch (e) {
      tagDistinct.push({ source: 'subdepartment', error: (e as Error).message })
    }
  }

  let propertyNamesSample: Record<string, unknown>[] = []
  try {
    const [rows] = await bq.query({
      query: `SELECT * FROM \`${PROJECT}.${DATASET}.parsed_breezeway_properties\` LIMIT 20`,
      useLegacySql: false,
    })
    propertyNamesSample = rows as Record<string, unknown>[]
  } catch (e) {
    propertyNamesSample = [{ _error: (e as Error).message }]
  }

  // ------------------------------------------------------------------------
  // Markdown to stdout — pipe into docs/maintenance-bq-schema.md.
  // ------------------------------------------------------------------------
  console.log('# Maintenance — Breezeway BigQuery Schema')
  console.log('')
  console.log(`Project:    ${fence(PROJECT)}`)
  console.log(`Dataset:    ${fence(DATASET)}`)
  console.log(`Generated:  ${new Date().toISOString()}`)
  console.log(`Tables:     ${tableNames.length}`)
  console.log('')

  console.log('## Table inventory')
  console.log('')
  console.log('| # | table | rows | columns |')
  console.log('|---|---|---:|---:|')
  tables.forEach((t, i) => {
    console.log(`| ${i + 1} | ${fence(t.table_name)} | ${t.rowCount} | ${t.columns.length} |`)
  })
  console.log('')

  for (const t of tables) {
    console.log(`## ${t.table_name}`)
    console.log('')
    console.log(`Rows: ${t.rowCount}`)
    console.log('')
    console.log('### Columns')
    console.log('')
    console.log('| # | name | type | nullable |')
    console.log('|---|---|---|---|')
    t.columns.forEach((c, i) => {
      console.log(`| ${i + 1} | ${fence(c.column_name)} | ${fence(c.data_type)} | ${c.is_nullable} |`)
    })
    console.log('')
    console.log('### Sample (5 rows)')
    console.log('')
    console.log('```json')
    console.log(JSON.stringify(t.sample, null, 2))
    console.log('```')
    console.log('')
  }

  // -- Phase 0 cross-cuts ---------------------------------------------------
  console.log('## Phase 0 — targeted diagnostics')
  console.log('')

  console.log('### Q1/Q2 — cost columns on `parsed_breezeway_tasks`')
  console.log('')
  const costCols = tasksCols.filter((c) =>
    /cost|price|rate|amount|labor|material|supplies|charge/i.test(c.column_name)
  )
  if (costCols.length === 0) {
    console.log('No cost-related columns found on `parsed_breezeway_tasks`. Material/labor split must rely on join with `parsed_breezeway_supplies` or heuristic.')
  } else {
    console.log('| name | type |')
    console.log('|---|---|')
    for (const c of costCols) console.log(`| ${fence(c.column_name)} | ${fence(c.data_type)} |`)
  }
  console.log('')

  console.log('### Q3 — task type signal')
  console.log('')
  if (tagDistinct.length === 0) {
    console.log('Neither `task_type` nor `subdepartment` columns present — classification must come from `parsed_breezeway_task_tags` join or title heuristic.')
  } else {
    for (const block of tagDistinct) {
      console.log(`**Source:** ${fence(block.source)}`)
      console.log('')
      if (block.error) {
        console.log(`error: ${block.error}`)
      } else {
        console.log('```json')
        console.log(JSON.stringify(block.rows, null, 2))
        console.log('```')
      }
      console.log('')
    }
  }

  console.log('### Q4 — date columns on `parsed_breezeway_tasks` (for cronograma)')
  console.log('')
  const dateCols = tasksCols.filter((c) =>
    /date|time|scheduled|due|created|started|completed|assigned/i.test(c.column_name) ||
    /DATE|TIME|TIMESTAMP/i.test(c.data_type)
  )
  console.log('| name | type |')
  console.log('|---|---|')
  for (const c of dateCols) console.log(`| ${fence(c.column_name)} | ${fence(c.data_type)} |`)
  console.log('')

  console.log('### Q5 — freshness column candidates (any table)')
  console.log('')
  const freshnessCols = allColumns.filter((c) =>
    /etl|loaded|ingest|sync|fetched|updated_at|last_updated/i.test(c.column_name)
  )
  if (freshnessCols.length === 0) {
    console.log('No obvious freshness column found across `parsed_breezeway_*`. Need to ask the ETL owner directly.')
  } else {
    console.log('| table | column | type |')
    console.log('|---|---|---|')
    for (const c of freshnessCols) {
      console.log(`| ${fence(c.table_name)} | ${fence(c.column_name)} | ${fence(c.data_type)} |`)
    }
  }
  console.log('')

  console.log('### Q6 — property name sample (for string-match vs Postgres `Unit.name`)')
  console.log('')
  console.log('```json')
  console.log(JSON.stringify(propertyNamesSample, null, 2))
  console.log('```')
  console.log('')

  console.log('## Decisions (fill in after inspecting above)')
  console.log('')
  console.log('- **Material vs labor split**: ☐ explicit columns ☐ join via `parsed_breezeway_supplies` ☐ heuristic (rate_paid = labor, rest = material, fallback 60/40)')
  console.log('- **Task type classification**: ☐ explicit `task_type` ☐ subdepartment-based ☐ tag-based (`parsed_breezeway_task_tags`) ☐ title heuristic')
  console.log('- **Preventive cronograma source**: ☐ scheduled_date on tasks ☐ due_date ☐ separate table ☐ derived from tags + recurrence')
  console.log('- **Property join key (BQ ↔ Postgres `Unit`)**: ☐ name prefix ☐ external_id field ☐ requires explicit mapping table')
  console.log('- **Freshness signal for UI badge**: ☐ etl_loaded_at column ☐ MAX(updated_at) ☐ none, document SLA verbally')
  console.log('- **Recharge owner column on tasks** (e.g. `bill_to`): ☐ confirmed name = ___ ☐ requires lookup join')
}

main().catch((e) => {
  console.error('Discovery failed:', e)
  process.exit(1)
})
