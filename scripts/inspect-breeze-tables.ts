import { BigQuery } from '@google-cloud/bigquery'

const bq = new BigQuery({
  projectId: process.env.BQ_PROJECT_ID ?? 'miami-vr-data',
  ...(process.env.BQ_CLIENT_EMAIL && process.env.BQ_PRIVATE_KEY
    ? {
        credentials: {
          client_email: process.env.BQ_CLIENT_EMAIL,
          private_key: process.env.BQ_PRIVATE_KEY.replace(/\n/g, '\n'),
        },
      }
    : {}),
})

const PROJECT = 'miami-vr-data'
const DATASET = 'ops'
const TABLES = ['breeze_tasks', 'breeze_supplies', 'breeze_reservation', 'breeze_employees', 'breeze_costs']

async function main() {
  try {
    // Get schema for all tables
    const [cols] = await bq.query({
      query: `SELECT table_name, column_name, data_type, is_nullable
              FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
              WHERE table_name IN UNNEST(@tables)
              ORDER BY table_name, ordinal_position`,
      params: { tables: TABLES },
      useLegacySql: false,
    })

    console.log('\n=== TABLE SCHEMAS ===\n')
    
    for (const tableName of TABLES) {
      const tableColumns = cols.filter((c: any) => c.table_name === tableName)
      console.log(`## ${tableName}`)
      
      if (tableColumns.length === 0) {
        console.log('  [TABLE NOT FOUND]')
        continue
      }
      
      // Print columns
      for (const col of tableColumns) {
        const nullable = col.is_nullable === 'YES' ? '✓' : '✗'
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${nullable})`)
      }
      
      // Get row count
      try {
        const [countResult] = await bq.query({
          query: `SELECT COUNT(*) AS n FROM \`${PROJECT}.${DATASET}.${tableName}\``,
          useLegacySql: false,
        })
        const rowCount = countResult[0]?.n ?? 0
        console.log(`  Row count: ${rowCount}`)
      } catch (e) {
        console.log(`  Row count: [ERROR]`)
      }
      
      console.log()
    }

    // Get sample data for specific tables
    console.log('\n=== SAMPLE DATA (breeze_tasks) ===\n')
    try {
      const [sampleTasks] = await bq.query({
        query: `SELECT * FROM \`${PROJECT}.${DATASET}.breeze_tasks\` LIMIT 2`,
        useLegacySql: false,
      })
      console.log(JSON.stringify(sampleTasks, null, 2))
    } catch (e: any) {
      console.log(`Error: ${e.message}`)
    }

    console.log('\n=== SAMPLE DATA (breeze_supplies) ===\n')
    try {
      const [sampleSupplies] = await bq.query({
        query: `SELECT * FROM \`${PROJECT}.${DATASET}.breeze_supplies\` LIMIT 2`,
        useLegacySql: false,
      })
      console.log(JSON.stringify(sampleSupplies, null, 2))
    } catch (e: any) {
      console.log(`Error: ${e.message}`)
    }

    console.log('\n=== SAMPLE DATA (breeze_costs) ===\n')
    try {
      const [sampleCosts] = await bq.query({
        query: `SELECT * FROM \`${PROJECT}.${DATASET}.breeze_costs\` LIMIT 2`,
        useLegacySql: false,
      })
      console.log(JSON.stringify(sampleCosts, null, 2))
    } catch (e: any) {
      console.log(`Error: ${e.message}`)
    }

    console.log('\n=== CROSS-TABLE ANALYSIS ===\n')
    
    // Check for cost fields in breeze_tasks
    try {
      const [checkCosts] = await bq.query({
        query: `SELECT column_name FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name = 'breeze_tasks' AND (column_name LIKE '%cost%' OR column_name LIKE '%price%')`,
        useLegacySql: false,
      })
      if (checkCosts.length > 0) {
        console.log('Cost fields in breeze_tasks:', checkCosts.map((c: any) => c.column_name).join(', '))
      } else {
        console.log('Cost fields in breeze_tasks: NONE')
      }
    } catch (e) {
      console.log('Cost fields check: ERROR')
    }

    // Check for task_type field
    try {
      const [checkType] = await bq.query({
        query: `SELECT column_name FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name = 'breeze_tasks' AND (column_name = 'task_type' OR column_name LIKE '%type%')`,
        useLegacySql: false,
      })
      if (checkType.length > 0) {
        console.log('Task type fields:', checkType.map((c: any) => c.column_name).join(', '))
      } else {
        console.log('Task type fields: NONE')
      }
    } catch (e) {
      console.log('Task type check: ERROR')
    }

    // Check for date fields
    try {
      const [checkDates] = await bq.query({
        query: `SELECT column_name FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name = 'breeze_tasks' AND (column_name LIKE '%date%' OR column_name LIKE '%time%')`,
        useLegacySql: false,
      })
      if (checkDates.length > 0) {
        console.log('Date/time fields in breeze_tasks:', checkDates.map((c: any) => c.column_name).join(', '))
      } else {
        console.log('Date/time fields in breeze_tasks: NONE')
      }
    } catch (e) {
      console.log('Date fields check: ERROR')
    }

    // Check breeze_reservation relationships
    try {
      const [resFields] = await bq.query({
        query: `SELECT column_name FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name = 'breeze_reservation' AND (column_name LIKE '%task%' OR column_name LIKE '%id%')`,
        useLegacySql: false,
      })
      if (resFields.length > 0) {
        console.log('ID/relationship fields in breeze_reservation:', resFields.map((c: any) => c.column_name).join(', '))
      }
    } catch (e) {
      console.log('Reservation fields check: ERROR')
    }

    // Check for freshness columns
    try {
      const [freshFields] = await bq.query({
        query: `SELECT table_name, column_name FROM \`${PROJECT}.${DATASET}.INFORMATION_SCHEMA.COLUMNS\`
                WHERE table_name IN UNNEST(@tables) AND (column_name LIKE '%updated%' OR column_name LIKE '%loaded%' OR column_name LIKE '%created%')`,
        params: { tables: TABLES },
        useLegacySql: false,
      })
      if (freshFields.length > 0) {
        const grouped = freshFields.reduce((acc: any, f: any) => {
          if (!acc[f.table_name]) acc[f.table_name] = []
          acc[f.table_name].push(f.column_name)
          return acc
        }, {})
        for (const [table, fields] of Object.entries(grouped)) {
          console.log(`Freshness fields in ${table}: ${(fields as string[]).join(', ')}`)
        }
      } else {
        console.log('No explicit freshness columns found')
      }
    } catch (e) {
      console.log('Freshness fields check: ERROR')
    }

  } catch (error: any) {
    console.error('FATAL ERROR:', error.message)
    process.exit(1)
  }
}

main()
