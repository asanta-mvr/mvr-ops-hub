'use client'

// Subdepartments tab — volume + cost by subdept, top recurring tasks table.
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ClipboardList } from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { ChartCard } from '../ChartCard'
import { KpiCard } from '../KpiCard'
import { COLORS, formatCurrency, formatNumber, tooltipCurrency, tooltipNumber } from '../format'
import type { MaintenanceFilterOptions, MaintenanceFilters, SubdeptAggregate } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     SubdeptAggregate
  filterOptions: MaintenanceFilterOptions
}

export function SubdeptTab({ filters, aggregate, filterOptions }: Props) {
  const k = aggregate.kpis

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="sd_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total tasks" value={formatNumber(k.totalTasks)} accent="primary" />
        <KpiCard label="Subdepartments" value={formatNumber(aggregate.bySubdept.length)} accent="steel" />
        <KpiCard label="Total cost"  value={formatCurrency(k.totalCost)} accent="success" />
        <KpiCard label="Top recurring titles" value={formatNumber(aggregate.topRecurring.length)} accent="sand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Volume by subdepartment" subtitle="Number of tasks per subdept">
          {aggregate.bySubdept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(280, aggregate.bySubdept.length * 30)}>
              <BarChart data={aggregate.bySubdept} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
                <XAxis type="number" stroke="#7A6E61" style={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" stroke="#7A6E61" style={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipNumber} />
                <Bar dataKey="taskCount" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Total cost by subdepartment" subtitle="From breeze_costs.cost_amount per task subdept">
          {aggregate.bySubdept.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(280, aggregate.bySubdept.length * 30)}>
              <BarChart data={aggregate.bySubdept} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
                <XAxis type="number" stroke="#7A6E61" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" stroke="#7A6E61" style={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
                <Bar dataKey="totalCost" fill={COLORS.success} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Top 20 recurring task names" subtitle="Patterns that come back the most — by lowercase normalized name">
        {aggregate.topRecurring.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                <tr>
                  <th className="text-left py-2 px-2 w-10">#</th>
                  <th className="text-left py-2 px-2">Task name</th>
                  <th className="text-left py-2 px-2">Subdept</th>
                  <th className="text-right py-2 px-2">Count</th>
                  <th className="text-right py-2 px-2">Total cost</th>
                  <th className="text-right py-2 px-2">Avg cost</th>
                </tr>
              </thead>
              <tbody>
                {aggregate.topRecurring.map((t, i) => (
                  <tr key={t.nameKey} className="border-b border-[#E0DBD4]/40 hover:bg-mvr-cream">
                    <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                    <td className="py-2 px-2 max-w-md truncate text-mvr-olive">{t.displayName}</td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">{t.topSubdept ?? '—'}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="inline-block px-2 py-0.5 rounded bg-mvr-primary/10 text-mvr-primary text-xs font-medium">{formatNumber(t.count)}</span>
                    </td>
                    <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(t.totalCost)}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{t.avgCost == null ? '—' : formatCurrency(t.avgCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  )
}

function Empty() {
  return <div className="py-12 text-center text-sm text-muted-foreground"><ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" /> No data in the current filter scope.</div>
}
