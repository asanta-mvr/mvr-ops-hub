// Live read layer over `miami-vr-data.ops.breeze_*`.
//
// Seven aggregate fetchers + a paginated task list + cached filter options.
// Every aggregate shares the CTE chain built by `buildScope(filters)`, which
// applies a HARD scope filter: `subdepartment_name IS NOT NULL`. Housekeeping
// and inspection tasks (Departure Clean, Site Manager Inspection) live in
// breeze_tasks under type_department='maintenance' but with subdept = NULL,
// and are excluded by default. Only true maintenance (Plumbing, HVAC,
// Electrical, Handy Work, etc.) flows through to the dashboard.
import { unstable_cache } from 'next/cache'
import { getBigQueryClient } from '@/lib/integrations/bigquery'
import {
  MAINTENANCE_STATUS_STAGES,
  type BuildingsAggregate,
  type KpiStats,
  type MaintenanceFilterOptions,
  type MaintenanceFilters,
  type MaintenanceStatusStage,
  type MaintenanceTaskRow,
  type MonthlyTrendAggregate,
  type OverviewAggregate,
  type OwnerCostsAggregate,
  type SubdeptAggregate,
  type TasksListAggregate,
  type TeamAggregate,
} from './types'

const T_TASKS = '`miami-vr-data.ops.breeze_tasks`'
const T_COSTS = '`miami-vr-data.ops.breeze_costs`'
const T_RES   = '`miami-vr-data.ops.breeze_reservation`'
const T_EMPS  = '`miami-vr-data.ops.breeze_employees`'

// Material / Labor classification (matches actual type_cost_name values seen
// in BQ: 'labor', 'skilled labor', 'materials', 'expense', 'mileage').
const SQL_MATERIAL_EXPR = "SUM(IF(LOWER(IFNULL(c.type_cost_name,'')) IN ('materials'), c.cost_amount, 0))"
const SQL_LABOR_EXPR    = "SUM(IF(LOWER(IFNULL(c.type_cost_name,'')) IN ('labor','skilled labor'), c.cost_amount, 0))"

// BQ returns DATE / TIMESTAMP columns as `{ value: '…' }` envelopes.
function unwrapBq(v: unknown): string | null {
  if (v == null) return null
  if (typeof v === 'string') return v
  if (typeof v === 'object' && v !== null && 'value' in v) {
    const inner = (v as { value: unknown }).value
    return typeof inner === 'string' ? inner : null
  }
  return null
}

function normalizeStage(raw: unknown): MaintenanceStatusStage {
  if (typeof raw !== 'string') return 'unknown'
  const lower = raw.toLowerCase()
  return (MAINTENANCE_STATUS_STAGES as readonly string[]).includes(lower)
    ? (lower as MaintenanceStatusStage)
    : 'unknown'
}

interface Scope {
  cte:    string
  params: Record<string, unknown>
}

// Build the shared CTE chain: res_dim → tasks_unfiltered → tasks_scoped.
//
// Inner WHERE (applies to breeze_tasks `t.*`):
//   - subdepartment_name IS NOT NULL  (HARD SCOPE — maintenance only)
//   - years, statuses, priorities, subdepts, billTos, q, dateFrom/To, tech
//
// Outer WHERE (applies to tasks_scoped, post-projection):
//   - buildings (filter against projected `building` column)
function buildScope(filters: MaintenanceFilters): Scope {
  // HARD scope filter — only "real maintenance" tasks (subdept-populated).
  const inner: string[] = ['t.subdepartment_name IS NOT NULL']
  const outer: string[] = []
  const params: Record<string, unknown> = {}

  if (filters.years.length > 0) {
    params.years = filters.years
    inner.push('EXTRACT(YEAR FROM t.created_at) IN UNNEST(@years)')
  }
  if (filters.statuses.length > 0) {
    params.statuses = filters.statuses.map((s) => s.toLowerCase())
    inner.push("LOWER(IFNULL(t.type_task_status_stage, 'unknown')) IN UNNEST(@statuses)")
  }
  if (filters.priorities.length > 0) {
    params.priorities = filters.priorities.map((p) => p.toLowerCase())
    inner.push("LOWER(IFNULL(t.type_priority, '')) IN UNNEST(@priorities)")
  }
  if (filters.subdepartments.length > 0) {
    params.subdepartments = filters.subdepartments
    inner.push('t.subdepartment_name IN UNNEST(@subdepartments)')
  }
  if (filters.billTos.length > 0) {
    params.billTos = filters.billTos.map((b) => b.toLowerCase())
    inner.push("LOWER(IFNULL(t.bill_to, '')) IN UNNEST(@billTos)")
  }
  if (filters.q) {
    params.q = filters.q.toLowerCase()
    inner.push("(LOWER(IFNULL(t.name, '')) LIKE CONCAT('%', @q, '%') OR LOWER(IFNULL(t.description, '')) LIKE CONCAT('%', @q, '%'))")
  }
  if (filters.dateFrom) {
    params.dateFrom = filters.dateFrom
    inner.push('DATE(t.created_at) >= DATE(@dateFrom)')
  }
  if (filters.dateTo) {
    params.dateTo = filters.dateTo
    inner.push('DATE(t.created_at) <= DATE(@dateTo)')
  }
  if (filters.technicians.length > 0) {
    params.technicians = filters.technicians
    inner.push('t.created_by_id IN UNNEST(@technicians)')
  }

  if (filters.buildings.length > 0) {
    params.buildings = filters.buildings
    outer.push('building IN UNNEST(@buildings)')
  }

  const innerWhere = `WHERE ${inner.join(' AND ')}`
  const outerWhere = outer.length > 0 ? `WHERE ${outer.join(' AND ')}` : ''

  const cte = `
    WITH res_dim AS (
      SELECT
        reference_property_id,
        ANY_VALUE(building HAVING MAX checkin_date) AS building,
        ANY_VALUE(name     HAVING MAX checkin_date) AS unit_name
      FROM ${T_RES}
      WHERE reference_property_id IS NOT NULL
      GROUP BY reference_property_id
    ),
    tasks_unfiltered AS (
      SELECT
        t.*,
        IFNULL(rd.building, 'Unassigned') AS building,
        rd.unit_name                       AS unit_name
      FROM ${T_TASKS} t
      LEFT JOIN res_dim rd USING (reference_property_id)
      ${innerWhere}
    ),
    tasks_scoped AS (
      SELECT * FROM tasks_unfiltered ${outerWhere}
    ),
    -- Pre-aggregated per-task cost rollup. Used by any query that needs
    -- material/labor/total per task without correlated subqueries (BQ rejects
    -- correlated subqueries that reference another table inside SELECT).
    costs_by_task AS (
      SELECT
        task_id,
        SUM(cost_amount)                                                              AS total_cost,
        SUM(IF(LOWER(IFNULL(type_cost_name,'')) IN ('materials'),        cost_amount, 0)) AS material_cost,
        SUM(IF(LOWER(IFNULL(type_cost_name,'')) IN ('labor','skilled labor'), cost_amount, 0)) AS labor_cost
      FROM ${T_COSTS}
      WHERE cost_amount IS NOT NULL
      GROUP BY task_id
    )
  `

  return { cte, params }
}

// ── Shared KPI block ─────────────────────────────────────────────────────
async function fetchKpis(filters: MaintenanceFilters): Promise<KpiStats> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  // JOIN against costs_by_task (1:0..1) — NOT raw breeze_costs (1:N) — so
  // task-level COUNTs and AVGs don't get inflated by per-task cost rows.
  const kpiSql = `
    ${cte}
    SELECT
      COUNT(*)                                                            AS total_tasks,
      COUNTIF(cbt.task_id IS NOT NULL)                                    AS tasks_with_cost_count,
      IFNULL(SUM(cbt.total_cost), 0)                                      AS total_cost,
      IFNULL(SUM(cbt.material_cost), 0)                                   AS material_cost,
      IFNULL(SUM(cbt.labor_cost), 0)                                      AS labor_cost,
      MAX(t.updated_at)                                                   AS last_ingested,
      COUNTIF(LOWER(IFNULL(t.type_task_status_stage,'unknown')) = 'finished') AS finished_n,
      AVG(IF(t.finished_at IS NOT NULL AND t.created_at IS NOT NULL,
             TIMESTAMP_DIFF(t.finished_at, t.created_at, MINUTE),
             NULL))                                                       AS avg_resolution_min
    FROM tasks_scoped t
    LEFT JOIN costs_by_task cbt ON cbt.task_id = t.id
  `

  const statusSql = `
    ${cte}
    SELECT LOWER(IFNULL(type_task_status_stage, 'unknown')) AS stage, COUNT(*) AS n
    FROM tasks_scoped
    GROUP BY stage
  `

  const prioritySql = `
    ${cte}
    SELECT LOWER(IFNULL(type_priority, 'unspecified')) AS priority, COUNT(*) AS n
    FROM tasks_scoped
    GROUP BY priority
  `

  const [[kpiRows], [statusRows], [priorityRows]] = await Promise.all([
    bq.query({ query: kpiSql,      params, useLegacySql: false }),
    bq.query({ query: statusSql,   params, useLegacySql: false }),
    bq.query({ query: prioritySql, params, useLegacySql: false }),
  ])

  const k = (kpiRows[0] ?? {}) as Record<string, unknown>
  const totalTasks         = Number(k.total_tasks ?? 0)
  const tasksWithCostCount = Number(k.tasks_with_cost_count ?? 0)
  const totalCost          = Number(k.total_cost ?? 0)
  const totalMaterial      = Number(k.material_cost ?? 0)
  const totalLabor         = Number(k.labor_cost ?? 0)
  const avgCostPerTask     = tasksWithCostCount > 0 ? totalCost / tasksWithCostCount : null
  const finishedN          = Number(k.finished_n ?? 0)
  const completionRate     = totalTasks > 0 ? finishedN / totalTasks : null
  const avgResolutionMin   = k.avg_resolution_min == null ? null : Number(k.avg_resolution_min)

  const statusMix = (statusRows as Array<{ stage?: string; n?: number | string }>)
    .map((r) => ({ stage: normalizeStage(r.stage), count: Number(r.n ?? 0) }))
    .sort((a, b) => b.count - a.count)

  const priorityMix = (priorityRows as Array<{ priority?: string; n?: number | string }>)
    .map((r) => ({ priority: String(r.priority ?? 'unspecified'), count: Number(r.n ?? 0) }))
    .sort((a, b) => b.count - a.count)

  return {
    totalTasks,
    tasksWithCostCount,
    totalCost,
    totalMaterial,
    totalLabor,
    avgCostPerTask,
    completionRate,
    avgResolutionMin,
    statusMix,
    priorityMix,
    lastIngested: unwrapBq(k.last_ingested),
  }
}

// ── Overview ─────────────────────────────────────────────────────────────

export async function fetchOverviewAggregate(filters: MaintenanceFilters): Promise<OverviewAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  const volumeSql = `
    ${cte}
    SELECT FORMAT_TIMESTAMP('%Y-%m', created_at) AS bucket, COUNT(*) AS n
    FROM tasks_scoped
    WHERE created_at IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket
  `

  const topSubdeptSql = `
    ${cte}
    SELECT
      subdepartment_name AS name,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY subdepartment_name
    ORDER BY task_count DESC
    LIMIT 10
  `

  const byBillToSql = `
    ${cte}
    SELECT
      LOWER(IFNULL(t.bill_to, 'unspecified')) AS bill_to,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY bill_to
    ORDER BY total_cost DESC
  `

  const [kpis, [volumeRows], [subdeptRows], [billToRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: volumeSql,     params, useLegacySql: false }),
    bq.query({ query: topSubdeptSql, params, useLegacySql: false }),
    bq.query({ query: byBillToSql,   params, useLegacySql: false }),
  ])

  return {
    kpis,
    volume: (volumeRows as Array<{ bucket?: string; n?: number | string }>)
      .filter((r) => Boolean(r.bucket))
      .map((r) => ({ bucket: String(r.bucket), count: Number(r.n ?? 0) })),
    statusDonut:   kpis.statusMix,
    priorityDonut: kpis.priorityMix,
    topSubdepts: (subdeptRows as Array<{ name?: string; task_count?: number | string; total_cost?: number | string }>)
      .map((r) => ({ name: String(r.name ?? ''), taskCount: Number(r.task_count ?? 0), totalCost: Number(r.total_cost ?? 0) })),
    byBillTo: (billToRows as Array<{ bill_to?: string; task_count?: number | string; total_cost?: number | string }>)
      .map((r) => ({ billTo: String(r.bill_to ?? 'unspecified'), taskCount: Number(r.task_count ?? 0), totalCost: Number(r.total_cost ?? 0) })),
  }
}

// ── Monthly Trend ────────────────────────────────────────────────────────

export async function fetchMonthlyAggregate(filters: MaintenanceFilters): Promise<MonthlyTrendAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  const monthlySql = `
    ${cte}
    SELECT
      FORMAT_TIMESTAMP('%Y-%m', t.created_at) AS month,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost,
      IFNULL(${SQL_MATERIAL_EXPR}, 0) AS material_cost,
      IFNULL(${SQL_LABOR_EXPR}, 0)    AS labor_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    WHERE t.created_at IS NOT NULL
    GROUP BY month
    ORDER BY month
  `

  const [kpis, [monthlyRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: monthlySql, params, useLegacySql: false }),
  ])

  return {
    kpis,
    monthly: (monthlyRows as Array<{ month?: string; task_count?: number | string; total_cost?: number | string; material_cost?: number | string; labor_cost?: number | string }>)
      .filter((r) => Boolean(r.month))
      .map((r) => {
        const tc  = Number(r.task_count ?? 0)
        const tot = Number(r.total_cost ?? 0)
        return {
          month:        String(r.month),
          taskCount:    tc,
          totalCost:    tot,
          materialCost: Number(r.material_cost ?? 0),
          laborCost:    Number(r.labor_cost ?? 0),
          avgCost:      tc > 0 ? tot / tc : null,
        }
      }),
  }
}

// ── Subdepartments ───────────────────────────────────────────────────────

export async function fetchSubdeptAggregate(filters: MaintenanceFilters): Promise<SubdeptAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  const bySubdeptSql = `
    ${cte}
    SELECT
      subdepartment_name AS name,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY subdepartment_name
    ORDER BY task_count DESC
  `

  // Three-stage aggregation, de-correlated for BQ:
  //   1. recurring_grouped collapses tasks by lowercased name_key
  //   2. cost_by_name aggregates cost per name_key via JOIN to costs_by_task
  //   3. outer SELECT joins (1) and (2) on name_key
  const recurringSql = `
    ${cte},
    recurring_grouped AS (
      SELECT
        LOWER(TRIM(IFNULL(t.name, '')))                              AS name_key,
        ANY_VALUE(t.name)                                            AS display_name,
        COUNT(DISTINCT t.id)                                         AS n,
        APPROX_TOP_COUNT(t.subdepartment_name, 1)[OFFSET(0)].value   AS top_subdept
      FROM tasks_scoped t
      WHERE LENGTH(TRIM(IFNULL(t.name, ''))) > 0
      GROUP BY name_key
    ),
    cost_by_name AS (
      SELECT
        LOWER(TRIM(IFNULL(t.name, ''))) AS name_key,
        IFNULL(SUM(cbt.total_cost), 0)  AS total_cost
      FROM tasks_scoped t
      LEFT JOIN costs_by_task cbt ON cbt.task_id = t.id
      WHERE LENGTH(TRIM(IFNULL(t.name, ''))) > 0
      GROUP BY name_key
    )
    SELECT
      rg.name_key,
      rg.display_name,
      rg.n,
      rg.top_subdept,
      IFNULL(cbn.total_cost, 0) AS total_cost
    FROM recurring_grouped rg
    LEFT JOIN cost_by_name cbn USING (name_key)
    ORDER BY n DESC
    LIMIT 20
  `

  const [kpis, [subdeptRows], [recurringRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: bySubdeptSql, params, useLegacySql: false }),
    bq.query({ query: recurringSql, params, useLegacySql: false }),
  ])

  const bySubdept = (subdeptRows as Array<{ name?: string; task_count?: number | string; total_cost?: number | string }>)
    .map((r) => {
      const tc  = Number(r.task_count ?? 0)
      const tot = Number(r.total_cost ?? 0)
      return { name: String(r.name ?? ''), taskCount: tc, totalCost: tot, avgCost: tc > 0 ? tot / tc : null }
    })

  const topRecurring = (recurringRows as Array<{ name_key?: string; display_name?: string; n?: number | string; total_cost?: number | string; top_subdept?: string | null }>)
    .map((r) => {
      const count = Number(r.n ?? 0)
      const tot   = Number(r.total_cost ?? 0)
      return {
        nameKey:     String(r.name_key ?? ''),
        displayName: String(r.display_name ?? r.name_key ?? ''),
        count,
        totalCost:   tot,
        avgCost:     count > 0 ? tot / count : null,
        topSubdept:  r.top_subdept ?? null,
      }
    })

  return { kpis, bySubdept, topRecurring }
}

// ── Buildings ────────────────────────────────────────────────────────────

export async function fetchBuildingsAggregate(filters: MaintenanceFilters): Promise<BuildingsAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  const byBuildingSql = `
    ${cte}
    SELECT
      building,
      COUNT(DISTINCT t.reference_property_id) AS units,
      COUNT(DISTINCT t.id)                    AS task_count,
      COUNT(DISTINCT IF(c.cost_amount IS NOT NULL, t.id, NULL)) AS tasks_with_cost,
      IFNULL(SUM(c.cost_amount), 0)           AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY building
    ORDER BY task_count DESC
  `

  const byUnitSql = `
    ${cte}
    SELECT
      building,
      IFNULL(unit_name, '(unnamed unit)') AS unit_name,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost,
      IFNULL(${SQL_MATERIAL_EXPR}, 0) AS material_cost,
      IFNULL(${SQL_LABOR_EXPR}, 0)    AS labor_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY building, unit_name
    ORDER BY building, task_count DESC
    LIMIT 1000
  `

  const [kpis, [buildingRows], [unitRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: byBuildingSql, params, useLegacySql: false }),
    bq.query({ query: byUnitSql,     params, useLegacySql: false }),
  ])

  const unitsByBuilding = new Map<string, Array<{ unitName: string | null; taskCount: number; totalCost: number; materialCost: number; laborCost: number }>>()
  for (const r of unitRows as Array<{ building?: string; unit_name?: string; task_count?: number | string; total_cost?: number | string; material_cost?: number | string; labor_cost?: number | string }>) {
    const b = String(r.building ?? 'Unassigned')
    const bucket = unitsByBuilding.get(b) ?? []
    bucket.push({
      unitName:     r.unit_name === '(unnamed unit)' ? null : String(r.unit_name ?? ''),
      taskCount:    Number(r.task_count ?? 0),
      totalCost:    Number(r.total_cost ?? 0),
      materialCost: Number(r.material_cost ?? 0),
      laborCost:    Number(r.labor_cost ?? 0),
    })
    unitsByBuilding.set(b, bucket)
  }

  const byBuilding = (buildingRows as Array<{ building?: string; units?: number | string; task_count?: number | string; tasks_with_cost?: number | string; total_cost?: number | string }>)
    .map((r) => {
      const building   = String(r.building ?? 'Unassigned')
      const units      = Number(r.units ?? 0)
      const taskCount  = Number(r.task_count ?? 0)
      const totalCost  = Number(r.total_cost ?? 0)
      return {
        building,
        units,
        taskCount,
        tasksWithCost:  Number(r.tasks_with_cost ?? 0),
        totalCost,
        avgCostPerUnit: units     > 0 ? totalCost / units     : null,
        avgCostPerTask: taskCount > 0 ? totalCost / taskCount : null,
        unitRows:       unitsByBuilding.get(building) ?? [],
      }
    })

  return { kpis, byBuilding }
}

// ── Team ─────────────────────────────────────────────────────────────────

export async function fetchTeamAggregate(filters: MaintenanceFilters): Promise<TeamAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  // JOIN against costs_by_task (1:0..1), not raw breeze_costs (1:N), to keep
  // task_count, finished_count, and avg_time correct.
  const teamSql = `
    ${cte}
    SELECT
      e.employee_id,
      e.first_name,
      e.last_name,
      IFNULL(e.active, FALSE) AS active,
      COUNT(*)                AS task_count,
      COUNTIF(t.finished_at IS NOT NULL) AS finished_count,
      AVG(IF(t.finished_at IS NOT NULL,
             TIMESTAMP_DIFF(t.finished_at, t.created_at, HOUR),
             NULL))           AS avg_time_to_finish_hours,
      IFNULL(SUM(cbt.total_cost), 0) AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_EMPS}     e   ON e.employee_id = t.created_by_id
    LEFT JOIN costs_by_task cbt ON cbt.task_id   = t.id
    GROUP BY e.employee_id, e.first_name, e.last_name, e.active
    ORDER BY task_count DESC
    LIMIT 100
  `

  const [kpis, [teamRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: teamSql, params, useLegacySql: false }),
  ])

  const byEmployee = (teamRows as Array<{
    employee_id?: number | string | null
    first_name?: string | null
    last_name?: string | null
    active?: boolean
    task_count?: number | string
    finished_count?: number | string
    avg_time_to_finish_hours?: number | string | null
    total_cost?: number | string
  }>).map((r) => {
    const empId = r.employee_id == null ? null : Number(r.employee_id)
    const first = r.first_name ?? ''
    const last  = r.last_name  ?? ''
    const display = [first, last].filter(Boolean).join(' ').trim() || (empId ? `Employee ${empId}` : 'Unassigned')
    return {
      employeeId:           empId,
      displayName:          display,
      active:               Boolean(r.active),
      taskCount:            Number(r.task_count ?? 0),
      finishedCount:        Number(r.finished_count ?? 0),
      avgTimeToFinishHours: r.avg_time_to_finish_hours == null ? null : Number(r.avg_time_to_finish_hours),
      totalCost:            Number(r.total_cost ?? 0),
    }
  })

  return { kpis, byEmployee }
}

// ── Owner Costs ──────────────────────────────────────────────────────────

export async function fetchOwnerCostsAggregate(filters: MaintenanceFilters): Promise<OwnerCostsAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)

  const byBillToSql = `
    ${cte}
    SELECT
      LOWER(IFNULL(t.bill_to, 'unspecified')) AS bill_to,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost,
      IFNULL(${SQL_MATERIAL_EXPR}, 0) AS material_cost,
      IFNULL(${SQL_LABOR_EXPR}, 0)    AS labor_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY bill_to
    ORDER BY total_cost DESC
  `

  const buildingsSql = `
    ${cte}
    SELECT
      building,
      COUNT(DISTINCT t.reference_property_id) AS units,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    GROUP BY building
    HAVING units > 0
    ORDER BY (IFNULL(SUM(c.cost_amount), 0) / COUNT(DISTINCT t.reference_property_id)) DESC
    LIMIT 10
  `

  const monthlySql = `
    ${cte}
    SELECT
      FORMAT_TIMESTAMP('%Y-%m', t.created_at) AS month,
      IFNULL(${SQL_MATERIAL_EXPR}, 0) AS material_cost,
      IFNULL(${SQL_LABOR_EXPR}, 0)    AS labor_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    WHERE t.created_at IS NOT NULL
    GROUP BY month
    ORDER BY month
  `

  const [kpis, [billToRows], [buildingRows], [monthlyRows]] = await Promise.all([
    fetchKpis(filters),
    bq.query({ query: byBillToSql,  params, useLegacySql: false }),
    bq.query({ query: buildingsSql, params, useLegacySql: false }),
    bq.query({ query: monthlySql,   params, useLegacySql: false }),
  ])

  return {
    kpis,
    byBillTo: (billToRows as Array<{ bill_to?: string; task_count?: number | string; total_cost?: number | string; material_cost?: number | string; labor_cost?: number | string }>)
      .map((r) => ({
        billTo:       String(r.bill_to ?? 'unspecified'),
        taskCount:    Number(r.task_count ?? 0),
        totalCost:    Number(r.total_cost ?? 0),
        materialCost: Number(r.material_cost ?? 0),
        laborCost:    Number(r.labor_cost ?? 0),
      })),
    avgCostPerUnitByBuilding: (buildingRows as Array<{ building?: string; units?: number | string; total_cost?: number | string }>)
      .map((r) => {
        const units     = Number(r.units ?? 0)
        const totalCost = Number(r.total_cost ?? 0)
        return {
          building:       String(r.building ?? 'Unassigned'),
          units,
          totalCost,
          avgCostPerUnit: units > 0 ? totalCost / units : null,
        }
      }),
    monthlyMaterialLabor: (monthlyRows as Array<{ month?: string; material_cost?: number | string; labor_cost?: number | string }>)
      .filter((r) => Boolean(r.month))
      .map((r) => ({
        month:        String(r.month),
        materialCost: Number(r.material_cost ?? 0),
        laborCost:    Number(r.labor_cost ?? 0),
      })),
  }
}

// ── Tasks list (paginated) ───────────────────────────────────────────────

// Assumes query joins `costs_by_task cbt ON cbt.task_id = t.id` so per-task
// cost rollups are available without correlated subqueries.
const TASK_SELECT_COLS = `
  CAST(t.id AS STRING) AS id,
  t.home_id,
  t.reference_property_id,
  t.name,
  t.description,
  t.type_priority AS priority,
  t.type_task_status_code AS status_code,
  LOWER(IFNULL(t.type_task_status_stage, 'unknown')) AS status_stage,
  t.subdepartment_name AS subdepartment,
  t.scheduled_date,
  t.created_at,
  t.updated_at,
  t.started_at,
  t.finished_at,
  t.finished_by_id,
  t.finished_by_name,
  t.created_by_id,
  t.created_by_name,
  t.bill_to,
  t.total_time_seconds,
  t.report_url,
  t.building,
  t.unit_name,
  IFNULL(cbt.total_cost, 0)    AS total_cost,
  IFNULL(cbt.material_cost, 0) AS material_cost,
  IFNULL(cbt.labor_cost, 0)    AS labor_cost
`

function rowToTask(r: Record<string, unknown>): MaintenanceTaskRow {
  const totalSecs = Number(r.total_time_seconds ?? 0)
  return {
    id:                  String(r.id ?? ''),
    homeId:              r.home_id == null ? null : Number(r.home_id),
    referencePropertyId: (r.reference_property_id as string | null | undefined) ?? null,
    name:                String(r.name ?? ''),
    description:         (r.description as string | null | undefined) ?? null,
    priority:            (r.priority as string | null | undefined) ?? null,
    statusCode:          (r.status_code as string | null | undefined) ?? null,
    statusStage:         normalizeStage(r.status_stage),
    subdepartment:       (r.subdepartment as string | null | undefined) ?? null,
    scheduledDate:       unwrapBq(r.scheduled_date),
    createdAt:           unwrapBq(r.created_at),
    updatedAt:           unwrapBq(r.updated_at),
    startedAt:           unwrapBq(r.started_at),
    finishedAt:          unwrapBq(r.finished_at),
    finishedById:        r.finished_by_id == null ? null : Number(r.finished_by_id),
    finishedByName:      (r.finished_by_name as string | null | undefined) ?? null,
    createdById:         r.created_by_id == null ? null : Number(r.created_by_id),
    createdByName:       (r.created_by_name as string | null | undefined) ?? null,
    billTo:              (r.bill_to as string | null | undefined) ?? null,
    totalCost:           Number(r.total_cost ?? 0),
    materialCost:        Number(r.material_cost ?? 0),
    laborCost:           Number(r.labor_cost ?? 0),
    totalTimeMinutes:    totalSecs > 0 ? Math.round(totalSecs / 60) : 0,
    building:            String(r.building ?? 'Unassigned'),
    unitName:            (r.unit_name as string | null | undefined) ?? null,
    reportUrl:           (r.report_url as string | null | undefined) ?? null,
  }
}

export async function fetchTasksList(filters: MaintenanceFilters): Promise<TasksListAggregate> {
  const bq = getBigQueryClient()
  const { cte, params } = buildScope(filters)
  const offset = filters.page * filters.pageSize

  const listSql = `
    ${cte}
    SELECT ${TASK_SELECT_COLS}
    FROM tasks_scoped t
    LEFT JOIN costs_by_task cbt ON cbt.task_id = t.id
    ORDER BY t.created_at DESC NULLS LAST
    LIMIT @limit OFFSET @offset
  `
  const countSql = `${cte} SELECT COUNT(*) AS n FROM tasks_scoped`

  const [[rows], [countRows]] = await Promise.all([
    bq.query({ query: listSql,  params: { ...params, limit: filters.pageSize, offset }, useLegacySql: false }),
    bq.query({ query: countSql, params, useLegacySql: false }),
  ])

  const totalCount = Number((countRows[0] as { n?: number | string }).n ?? 0)
  return {
    rows:       (rows as Array<Record<string, unknown>>).map(rowToTask),
    totalCount,
    page:       filters.page,
    pageSize:   filters.pageSize,
  }
}

// ── Units Detail (lazy, single unit) ─────────────────────────────────────
//
// Called by the /api/v1/maintenance/unit-detail route when the user picks a
// unit on the Units Detail tab. Returns monthly material/labor + a flat task
// list scoped to that unit + the global filter set.
export interface UnitMonthlyPoint {
  month:        string
  taskCount:    number
  materialCost: number
  laborCost:    number
  totalCost:    number
}

export interface UnitDetailResult {
  unitName:    string
  building:    string | null
  monthly:     UnitMonthlyPoint[]
  tasks:       MaintenanceTaskRow[]
}

export async function fetchUnitDetail(
  filters: MaintenanceFilters,
  unitName: string,
): Promise<UnitDetailResult> {
  const bq = getBigQueryClient()
  const { cte, params: baseParams } = buildScope(filters)
  const params: Record<string, unknown> = { ...baseParams, unitName }

  const monthlySql = `
    ${cte}
    SELECT
      FORMAT_TIMESTAMP('%Y-%m', t.created_at) AS month,
      COUNT(DISTINCT t.id) AS task_count,
      IFNULL(SUM(c.cost_amount), 0) AS total_cost,
      IFNULL(${SQL_MATERIAL_EXPR}, 0) AS material_cost,
      IFNULL(${SQL_LABOR_EXPR}, 0)    AS labor_cost
    FROM tasks_scoped t
    LEFT JOIN ${T_COSTS} c ON c.task_id = t.id
    WHERE t.unit_name = @unitName AND t.created_at IS NOT NULL
    GROUP BY month
    ORDER BY month
  `

  const tasksSql = `
    ${cte}
    SELECT ${TASK_SELECT_COLS}
    FROM tasks_scoped t
    LEFT JOIN costs_by_task cbt ON cbt.task_id = t.id
    WHERE t.unit_name = @unitName
    ORDER BY t.created_at DESC NULLS LAST
    LIMIT 500
  `

  const buildingSql = `
    ${cte}
    SELECT ANY_VALUE(building) AS building FROM tasks_scoped WHERE unit_name = @unitName
  `

  const [[monthlyRows], [taskRows], [buildingRows]] = await Promise.all([
    bq.query({ query: monthlySql,  params, useLegacySql: false }),
    bq.query({ query: tasksSql,    params, useLegacySql: false }),
    bq.query({ query: buildingSql, params, useLegacySql: false }),
  ])

  return {
    unitName,
    building: (buildingRows[0] as { building?: string | null } | undefined)?.building ?? null,
    monthly: (monthlyRows as Array<{ month?: string; task_count?: number | string; total_cost?: number | string; material_cost?: number | string; labor_cost?: number | string }>)
      .filter((r) => Boolean(r.month))
      .map((r) => ({
        month:        String(r.month),
        taskCount:    Number(r.task_count ?? 0),
        totalCost:    Number(r.total_cost ?? 0),
        materialCost: Number(r.material_cost ?? 0),
        laborCost:    Number(r.labor_cost ?? 0),
      })),
    tasks: (taskRows as Array<Record<string, unknown>>).map(rowToTask),
  }
}

// ── Filter options (cached) ──────────────────────────────────────────────
async function fetchFilterOptionsUncached(): Promise<MaintenanceFilterOptions> {
  const bq = getBigQueryClient()

  const yearsSql = `
    SELECT DISTINCT EXTRACT(YEAR FROM created_at) AS y
    FROM ${T_TASKS}
    WHERE created_at IS NOT NULL AND subdepartment_name IS NOT NULL
    ORDER BY y DESC
  `
  const statusesSql = `
    SELECT DISTINCT LOWER(type_task_status_stage) AS s
    FROM ${T_TASKS}
    WHERE type_task_status_stage IS NOT NULL AND subdepartment_name IS NOT NULL
  `
  const prioritiesSql = `
    SELECT DISTINCT LOWER(type_priority) AS p
    FROM ${T_TASKS}
    WHERE type_priority IS NOT NULL AND subdepartment_name IS NOT NULL
  `
  const subdeptsSql = `
    SELECT DISTINCT subdepartment_name AS s
    FROM ${T_TASKS}
    WHERE subdepartment_name IS NOT NULL
    ORDER BY s
  `
  const buildingsSql = `
    SELECT DISTINCT building
    FROM (
      SELECT ANY_VALUE(building HAVING MAX checkin_date) AS building
      FROM ${T_RES}
      WHERE reference_property_id IS NOT NULL AND building IS NOT NULL
      GROUP BY reference_property_id
    )
    WHERE building IS NOT NULL
    ORDER BY building
  `
  const billTosSql = `
    SELECT DISTINCT LOWER(bill_to) AS b
    FROM ${T_TASKS}
    WHERE bill_to IS NOT NULL AND subdepartment_name IS NOT NULL
  `
  const costTypesSql = `
    SELECT DISTINCT LOWER(type_cost_name) AS ct
    FROM ${T_COSTS}
    WHERE cost_amount IS NOT NULL AND type_cost_name IS NOT NULL
    ORDER BY ct
  `
  const employeesSql = `
    SELECT employee_id, first_name, last_name, IFNULL(active, FALSE) AS active
    FROM ${T_EMPS}
    ORDER BY first_name, last_name
  `

  const [
    [yearRows], [statusRows], [priorityRows], [subdeptRows], [buildingRows],
    [billToRows], [costTypeRows], [empRows],
  ] = await Promise.all([
    bq.query({ query: yearsSql,      useLegacySql: false }),
    bq.query({ query: statusesSql,   useLegacySql: false }),
    bq.query({ query: prioritiesSql, useLegacySql: false }),
    bq.query({ query: subdeptsSql,   useLegacySql: false }),
    bq.query({ query: buildingsSql,  useLegacySql: false }),
    bq.query({ query: billTosSql,    useLegacySql: false }),
    bq.query({ query: costTypesSql,  useLegacySql: false }),
    bq.query({ query: employeesSql,  useLegacySql: false }),
  ])

  const years = (yearRows as Array<{ y?: number | string }>)
    .map((r) => Number(r.y))
    .filter((n) => Number.isInteger(n) && n >= 2000 && n <= 2100)

  const statuses = (statusRows as Array<{ s?: string }>)
    .map((r) => r.s).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const priorities = (priorityRows as Array<{ p?: string }>)
    .map((r) => r.p).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const subdepartments = (subdeptRows as Array<{ s?: string }>)
    .map((r) => r.s).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const buildings = (buildingRows as Array<{ building?: string }>)
    .map((r) => r.building).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const billTos = (billToRows as Array<{ b?: string }>)
    .map((r) => r.b).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const costTypes = (costTypeRows as Array<{ ct?: string }>)
    .map((r) => r.ct).filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  const technicians = (empRows as Array<{
    employee_id?: number | string
    first_name?: string | null
    last_name?: string | null
    active?: boolean
  }>).map((r) => {
    const empId = Number(r.employee_id ?? 0)
    const first = r.first_name ?? ''
    const last  = r.last_name  ?? ''
    const displayName = [first, last].filter(Boolean).join(' ').trim() || `Employee ${empId}`
    return { employeeId: empId, displayName, active: Boolean(r.active) }
  }).filter((e) => e.employeeId > 0)

  return { years, statuses, priorities, subdepartments, buildings, billTos, costTypes, technicians }
}

export const fetchFilterOptions = unstable_cache(
  fetchFilterOptionsUncached,
  ['maintenance-filter-options-v3'],
  { revalidate: 300, tags: ['maintenance-filter-options'] },
)
