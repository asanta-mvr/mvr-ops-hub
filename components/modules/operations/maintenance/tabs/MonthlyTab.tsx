'use client'

// Monthly Trend tab — tasks per month, material vs labor stacked, avg cost trend.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ClipboardList } from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { ChartCard } from '../ChartCard'
import { KpiCard } from '../KpiCard'
import { COLORS, MATERIAL_LABOR_COLORS, formatCurrency, formatNumber, formatPercent, tooltipCurrency, tooltipNumber } from '../format'
import type { MaintenanceFilterOptions, MaintenanceFilters, MonthlyTrendAggregate } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     MonthlyTrendAggregate
  filterOptions: MaintenanceFilterOptions
}

export function MonthlyTab({ filters, aggregate, filterOptions }: Props) {
  const k = aggregate.kpis
  const data = aggregate.monthly

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="mt_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total tasks" value={formatNumber(k.totalTasks)} accent="primary" />
        <KpiCard label="Total cost"  value={formatCurrency(k.totalCost)}
          sub={k.totalTasks > 0 ? `Coverage ${formatPercent(k.tasksWithCostCount / k.totalTasks)}` : undefined}
          accent="success" />
        <KpiCard label="Material" value={formatCurrency(k.totalMaterial)} accent="sand" />
        <KpiCard label="Labor"    value={formatCurrency(k.totalLabor)}    accent="steel" />
      </div>

      <ChartCard title="Tasks per month" subtitle="Volume of maintenance tasks created each month">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis dataKey="month" stroke="#7A6E61" style={{ fontSize: 11 }} />
              <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipNumber} />
              <Bar dataKey="taskCount" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Tasks" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Material vs labor cost per month" subtitle="Stacked area — sourced from breeze_costs.type_cost_name">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis dataKey="month" stroke="#7A6E61" style={{ fontSize: 11 }} />
              <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="materialCost" stackId="1" stroke={MATERIAL_LABOR_COLORS.material} fill={MATERIAL_LABOR_COLORS.material} fillOpacity={0.55} name="Material" />
              <Area type="monotone" dataKey="laborCost"    stackId="1" stroke={MATERIAL_LABOR_COLORS.labor}    fill={MATERIAL_LABOR_COLORS.labor}    fillOpacity={0.55} name="Labor" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Average cost per task" subtitle="Total cost ÷ tasks-with-cost in each month">
        {data.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis dataKey="month" stroke="#7A6E61" style={{ fontSize: 11 }} />
              <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
              <Line type="monotone" dataKey="avgCost" stroke={COLORS.warning} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.warning }} activeDot={{ r: 6 }} name="Avg cost / task" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

function Empty() {
  return <div className="py-12 text-center text-sm text-muted-foreground"><ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" /> No data in the current filter scope.</div>
}
