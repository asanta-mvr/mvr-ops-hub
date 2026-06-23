import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import {
  fetchBuildingsAggregate,
  fetchFilterOptions,
  fetchMonthlyAggregate,
  fetchOverviewAggregate,
  fetchOwnerCostsAggregate,
  fetchSubdeptAggregate,
  fetchTasksList,
  fetchTeamAggregate,
} from '@/lib/maintenance/bq'
import {
  MAINTENANCE_PARAM_SUFFIXES,
  MAINTENANCE_TAB_PREFIXES,
  parseMaintenanceFilters,
  type MaintenanceSearchParams,
} from '@/lib/maintenance/filters'
import { MaintenanceClient } from '@/components/modules/operations/maintenance/MaintenanceClient'

export const metadata: Metadata = { title: 'Maintenance Report' }

export const dynamic    = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: MaintenanceSearchParams
}

export default async function MaintenancePage({ searchParams }: PageProps) {
  try {
    return await renderMaintenancePage(searchParams)
  } catch (err) {
    const digest = (err as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) throw err
    console.error('[MaintenancePage] runtime crash', {
      message: err instanceof Error ? err.message : String(err),
      name:    err instanceof Error ? err.name    : undefined,
      stack:   err instanceof Error ? err.stack   : undefined,
      digest,
    })
    throw err
  }
}

async function renderMaintenancePage(searchParams: MaintenanceSearchParams) {
  const session = await auth()
  await requireView(session, 'operations.maintenance', '/no-access')

  // First-entry default: redirect with current year set on every tab prefix.
  const hasAnyFilter = MAINTENANCE_TAB_PREFIXES.some((prefix) =>
    MAINTENANCE_PARAM_SUFFIXES.some((suffix) => searchParams[`${prefix}${suffix}`] !== undefined)
  )
  if (!hasAnyFilter) {
    const defaults = new URLSearchParams()
    const year = String(new Date().getUTCFullYear())
    for (const prefix of MAINTENANCE_TAB_PREFIXES) defaults.set(`${prefix}year`, year)
    redirect(`/operations/maintenance?${defaults.toString()}`)
  }

  // One filter scope per tab — they hold independent state in the URL.
  const overviewFilters  = parseMaintenanceFilters(searchParams, 'ov_')
  const monthlyFilters   = parseMaintenanceFilters(searchParams, 'mt_')
  const subdeptFilters   = parseMaintenanceFilters(searchParams, 'sd_')
  const buildingsFilters = parseMaintenanceFilters(searchParams, 'bld_')
  const unitsFilters     = parseMaintenanceFilters(searchParams, 'un_')
  const teamFilters      = parseMaintenanceFilters(searchParams, 'team_')
  const costFilters      = parseMaintenanceFilters(searchParams, 'cost_')
  const tasksFilters     = parseMaintenanceFilters(searchParams, 'tasks_')

  const [
    filterOptions,
    overviewAggregate,
    monthlyAggregate,
    subdeptAggregate,
    buildingsAggregate,
    teamAggregate,
    ownerCostsAggregate,
    tasksList,
  ] = await Promise.all([
    fetchFilterOptions(),
    fetchOverviewAggregate(overviewFilters),
    fetchMonthlyAggregate(monthlyFilters),
    fetchSubdeptAggregate(subdeptFilters),
    fetchBuildingsAggregate(buildingsFilters),
    fetchTeamAggregate(teamFilters),
    fetchOwnerCostsAggregate(costFilters),
    fetchTasksList(tasksFilters),
  ])

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-display text-mvr-primary">Maintenance Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real maintenance only (Plumbing, HVAC, Electrical, Handy Work, Pest Control, …) —
          housekeeping and routine inspections are excluded by default.
        </p>
      </div>

      <MaintenanceClient
        overviewFilters={overviewFilters}
        overviewAggregate={overviewAggregate}
        monthlyFilters={monthlyFilters}
        monthlyAggregate={monthlyAggregate}
        subdeptFilters={subdeptFilters}
        subdeptAggregate={subdeptAggregate}
        buildingsFilters={buildingsFilters}
        buildingsAggregate={buildingsAggregate}
        unitsFilters={unitsFilters}
        teamFilters={teamFilters}
        teamAggregate={teamAggregate}
        costFilters={costFilters}
        ownerCostsAggregate={ownerCostsAggregate}
        tasksFilters={tasksFilters}
        tasksList={tasksList}
        filterOptions={filterOptions}
      />
    </div>
  )
}
