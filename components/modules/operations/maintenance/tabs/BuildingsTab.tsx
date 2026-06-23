'use client'

// Buildings tab — ranking by tasks + cost, with click-to-expand units list.
import { Fragment, useState } from 'react'
import { Building2, ChevronRight, ClipboardList } from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { ChartCard } from '../ChartCard'
import { KpiCard } from '../KpiCard'
import { formatCurrency, formatNumber } from '../format'
import type { BuildingsAggregate, MaintenanceFilterOptions, MaintenanceFilters } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     BuildingsAggregate
  filterOptions: MaintenanceFilterOptions
}

export function BuildingsTab({ filters, aggregate, filterOptions }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const k = aggregate.kpis
  const rows = aggregate.byBuilding

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="bld_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total tasks"  value={formatNumber(k.totalTasks)} accent="primary" />
        <KpiCard label="Buildings"    value={formatNumber(rows.length)} icon={Building2} accent="steel" />
        <KpiCard label="Total cost"   value={formatCurrency(k.totalCost)} accent="success" />
        <KpiCard label="Avg cost / task" value={k.avgCostPerTask == null ? '—' : formatCurrency(k.avgCostPerTask)} accent="primary" />
      </div>

      <ChartCard title="Buildings ranking" subtitle="Click a building to see its unit-level breakdown">
        {rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground"><ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" /> No buildings in scope.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                <tr>
                  <th className="text-left py-2 px-2">Building</th>
                  <th className="text-right py-2 px-2">Units</th>
                  <th className="text-right py-2 px-2">Tasks</th>
                  <th className="text-right py-2 px-2">Total cost</th>
                  <th className="text-right py-2 px-2">Avg / unit</th>
                  <th className="text-right py-2 px-2">Avg / task</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map((b) => {
                  const isOpen = expanded === b.building
                  const isUnassigned = b.building === 'Unassigned'
                  return (
                    <Fragment key={b.building}>
                      <tr
                        onClick={() => setExpanded(isOpen ? null : b.building)}
                        className={`border-b border-[#E0DBD4]/40 cursor-pointer hover:bg-mvr-cream ${isOpen ? 'bg-mvr-primary/5' : ''} ${isUnassigned ? 'bg-mvr-warning-light/40' : ''}`}
                      >
                        <td className="py-2 px-2 font-medium text-mvr-olive">{b.building}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{formatNumber(b.units)}</td>
                        <td className="py-2 px-2 text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-mvr-primary/10 text-mvr-primary text-xs font-medium">{formatNumber(b.taskCount)}</span>
                        </td>
                        <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(b.totalCost)}</td>
                        <td className="py-2 px-2 text-right text-mvr-warning">{b.avgCostPerUnit == null ? '—' : formatCurrency(b.avgCostPerUnit)}</td>
                        <td className="py-2 px-2 text-right text-muted-foreground">{b.avgCostPerTask == null ? '—' : formatCurrency(b.avgCostPerTask)}</td>
                        <td className="py-2 px-2"><ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} /></td>
                      </tr>
                      {isOpen ? (
                        <tr className="bg-mvr-cream/50">
                          <td colSpan={7} className="p-3">
                            {b.unitRows.length === 0 ? (
                              <div className="text-xs text-muted-foreground text-center py-4">No unit detail available.</div>
                            ) : (
                              <div className="overflow-x-auto rounded-lg bg-white border border-[#E0DBD4]">
                                <table className="w-full text-sm">
                                  <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                                    <tr>
                                      <th className="text-left py-2 px-2">Unit</th>
                                      <th className="text-right py-2 px-2">Tasks</th>
                                      <th className="text-right py-2 px-2">Total cost</th>
                                      <th className="text-right py-2 px-2">Material</th>
                                      <th className="text-right py-2 px-2">Labor</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {b.unitRows.map((u, i) => (
                                      <tr key={i} className="border-b border-[#E0DBD4]/40 last:border-0">
                                        <td className="py-2 px-2 text-mvr-olive">{u.unitName ?? '(unnamed)'}</td>
                                        <td className="py-2 px-2 text-right">{formatNumber(u.taskCount)}</td>
                                        <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(u.totalCost)}</td>
                                        <td className="py-2 px-2 text-right text-[#6B5B95]">{formatCurrency(u.materialCost)}</td>
                                        <td className="py-2 px-2 text-right text-[#3C8DAD]">{formatCurrency(u.laborCost)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  )
}
