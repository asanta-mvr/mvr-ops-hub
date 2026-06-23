// Shared types + Zod schemas for the Maintenance Report v2 module.
//
// Source of truth: BigQuery tables under `miami-vr-data.ops.breeze_*`:
//   - breeze_tasks       (71,521 rows total)  fact table
//   - breeze_costs       (72,679 rows total)  ~10.7% populated; INNER JOIN cost_amount IS NOT NULL
//   - breeze_reservation (16,329 rows)        property -> building dimension
//   - breeze_employees   (54     rows)        creator/technician dimension
//
// HARD SCOPE FILTER: every aggregate filters tasks to `subdepartment_name IS NOT NULL`
// (~5,500 tasks). This is what MVR considers "real maintenance" — Plumbing,
// HVAC, Electrical, Handy Work, Pest Control, Appliances, Safety, etc. The
// other ~66k tasks are housekeeping/inspection (Departure Clean, Site Manager
// Arrival Inspection) and are excluded by default.
import { z } from 'zod'

// ── Status workflow (matches what's actually in BQ) ──────────────────────
// breeze_tasks.type_task_status_stage observed values: 'new', 'in_progress',
// 'finished'. Anything else → 'unknown'.
export const MAINTENANCE_STATUS_STAGES = [
  'new',
  'in_progress',
  'finished',
  'unknown',
] as const
export type MaintenanceStatusStage = (typeof MAINTENANCE_STATUS_STAGES)[number]

// ── Tab prefixes (8 tabs, mirrors the reference dashboard) ───────────────
export const MAINTENANCE_TAB_PREFIXES = [
  'ov_',     // Overview
  'mt_',     // Monthly Trend
  'sd_',     // Subdepartments
  'bld_',    // Buildings
  'un_',     // Units Detail
  'team_',   // Team
  'cost_',   // Owner Costs
  'tasks_',  // Tasks Table
] as const
export type MaintenanceTabPrefix = (typeof MAINTENANCE_TAB_PREFIXES)[number]

// ── Filter Zod schema ────────────────────────────────────────────────────
export const maintenanceFiltersSchema = z.object({
  years:          z.array(z.number().int().min(2000).max(2100)).default([]),
  statuses:       z.array(z.string()).default([]),
  priorities:     z.array(z.string()).default([]),
  buildings:      z.array(z.string()).default([]),
  /** Subdepartment multi-select — e.g. ['Plumbing', 'HVAC']. */
  subdepartments: z.array(z.string()).default([]),
  billTos:        z.array(z.string()).default([]),
  q:              z.string().trim().min(1).max(120).optional(),
  dateFrom:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  technicians:    z.array(z.number().int()).default([]),
  costTypes:      z.array(z.string()).default([]),
  page:           z.number().int().min(0).default(0),
  pageSize:       z.number().int().min(1).max(200).default(50),
})

export type MaintenanceFilters = z.infer<typeof maintenanceFiltersSchema>

// ── Row types (BQ envelope unwrapped) ────────────────────────────────────

export interface MaintenanceTaskRow {
  id:                  string
  homeId:              number | null
  referencePropertyId: string | null
  name:                string
  description:         string | null
  priority:            string | null
  statusCode:          string | null
  statusStage:         MaintenanceStatusStage
  subdepartment:       string | null
  scheduledDate:       string | null
  createdAt:           string | null
  updatedAt:           string | null
  startedAt:           string | null
  finishedAt:          string | null
  finishedById:        number | null
  finishedByName:      string | null
  createdById:         number | null
  createdByName:       string | null
  billTo:              string | null
  totalCost:           number
  materialCost:        number
  laborCost:           number
  totalTimeMinutes:    number
  /** Building projected via reservation join; "Unassigned" when no match. */
  building:            string
  /** Unit name (from breeze_reservation.name, most-recent reservation). */
  unitName:            string | null
  reportUrl:           string | null
}

// ── Shared KPI shape ────────────────────────────────────────────────────
//
// Material + labor split is REAL — derived from `type_cost_name` on
// breeze_costs: 'labor' and 'skilled labor' → labor, 'materials' → material.
// 'expense', 'mileage', null → 'other'.
export interface KpiStats {
  totalTasks:         number
  /** Distinct task ids that have at least one cost row with cost_amount IS NOT NULL. */
  tasksWithCostCount: number
  totalCost:          number
  totalMaterial:      number
  totalLabor:         number
  avgCostPerTask:     number | null
  statusMix:          Array<{ stage: MaintenanceStatusStage; count: number }>
  priorityMix:        Array<{ priority: string; count: number }>
  /** % tasks with status_stage = 'finished'. */
  completionRate:     number | null
  /** AVG resolution time across finished tasks, in minutes. */
  avgResolutionMin:   number | null
  lastIngested:       string | null
}

// ── Per-tab aggregate envelopes ──────────────────────────────────────────

export interface OverviewAggregate {
  kpis:          KpiStats
  /** Monthly volume bucket ('YYYY-MM' keys). */
  volume:        Array<{ bucket: string; count: number }>
  statusDonut:   Array<{ stage: MaintenanceStatusStage; count: number }>
  priorityDonut: Array<{ priority: string; count: number }>
  /** Top 10 subdepartments by task volume. */
  topSubdepts:   Array<{ name: string; taskCount: number; totalCost: number }>
  /** Cost split by bill_to (full breakdown for the small-multiple bar viz). */
  byBillTo:      Array<{ billTo: string; taskCount: number; totalCost: number }>
}

export interface MonthlyTrendAggregate {
  kpis:    KpiStats
  monthly: Array<{
    month:        string  // 'YYYY-MM'
    taskCount:    number
    totalCost:    number
    materialCost: number
    laborCost:    number
    avgCost:      number | null
  }>
}

export interface SubdeptAggregate {
  kpis:      KpiStats
  /** All subdepartments — ranking by volume + cost. */
  bySubdept: Array<{
    name:      string
    taskCount: number
    totalCost: number
    avgCost:   number | null
  }>
  /** Top 20 recurring task names (keyed by LOWER(TRIM(name))). */
  topRecurring: Array<{
    nameKey:     string
    displayName: string
    count:       number
    totalCost:   number
    avgCost:     number | null
    topSubdept:  string | null
  }>
}

export interface BuildingsAggregate {
  kpis:       KpiStats
  byBuilding: Array<{
    building:      string
    units:         number    // distinct units in the building
    taskCount:     number
    totalCost:     number
    tasksWithCost: number
    avgCostPerUnit: number | null
    avgCostPerTask: number | null
    /** Up to 50 units per building. */
    unitRows: Array<{
      unitName:  string | null
      taskCount: number
      totalCost: number
      materialCost: number
      laborCost: number
    }>
  }>
}

export interface TeamAggregate {
  kpis:       KpiStats
  byEmployee: Array<{
    employeeId:            number | null
    displayName:           string
    active:                boolean
    taskCount:             number
    finishedCount:         number
    avgTimeToFinishHours:  number | null
    totalCost:             number
  }>
}

export interface OwnerCostsAggregate {
  kpis:     KpiStats
  byBillTo: Array<{
    billTo:       string
    taskCount:    number
    totalCost:    number
    materialCost: number
    laborCost:    number
  }>
  /** Top 10 buildings by avg cost per unit. */
  avgCostPerUnitByBuilding: Array<{
    building:      string
    units:         number
    totalCost:     number
    avgCostPerUnit: number | null
  }>
  /** Monthly material vs labor stacked area. */
  monthlyMaterialLabor: Array<{
    month:        string
    materialCost: number
    laborCost:    number
  }>
}

export interface TasksListAggregate {
  rows:       MaintenanceTaskRow[]
  totalCount: number
  page:       number
  pageSize:   number
}

// ── Filter dropdown options ──────────────────────────────────────────────
export interface MaintenanceFilterOptions {
  years:          number[]
  statuses:       string[]
  priorities:     string[]
  buildings:      string[]
  subdepartments: string[]
  billTos:        string[]
  costTypes:      string[]
  technicians:    Array<{ employeeId: number; displayName: string; active: boolean }>
}
