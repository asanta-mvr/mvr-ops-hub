'use client'

import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import type { MaintenanceFilterOptions, MaintenanceFilters } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  filterOptions: MaintenanceFilterOptions
}

export function UnitsDetailTab({ filters, filterOptions }: Props) {
  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="un_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />
      <div className="rounded-xl border border-[#E0DBD4] bg-white p-4 shadow-card">
        <h3 className="text-sm font-medium text-mvr-primary mb-2">Units Detail — coming next</h3>
        <p className="text-xs text-muted-foreground">
          This tab will let you pick a unit and see its monthly material vs labor cost,
          with click-to-drill into the individual tasks for that unit × month.
          Lazy-loaded via API once you select a unit.
        </p>
      </div>
    </div>
  )
}
