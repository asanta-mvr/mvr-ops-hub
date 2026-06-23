'use client'

// Team tab — per-technician volume + avg time-to-finish.
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
import { COLORS, formatCurrency, formatNumber, tooltipNumber } from '../format'
import type { MaintenanceFilterOptions, MaintenanceFilters, TeamAggregate } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     TeamAggregate
  filterOptions: MaintenanceFilterOptions
}

function fmtHours(h: number | null | undefined): string {
  if (h == null || !Number.isFinite(h)) return '—'
  if (h >= 48) return `${Math.round(h / 24)}d`
  if (h >= 1)  return `${h.toFixed(1)}h`
  return `${Math.round(h * 60)}m`
}

export function TeamTab({ filters, aggregate, filterOptions }: Props) {
  const k    = aggregate.kpis
  const rows = aggregate.byEmployee
  const top10 = rows.slice(0, 10)

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="team_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total tasks" value={formatNumber(k.totalTasks)} accent="primary" />
        <KpiCard label="Team members in scope" value={formatNumber(rows.length)} accent="steel" />
        <KpiCard label="Avg resolution" value={k.avgResolutionMin == null ? '—' : `${Math.round(k.avgResolutionMin / 60)}h`} accent="success" />
        <KpiCard label="Total cost" value={formatCurrency(k.totalCost)} accent="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Top 10 technicians by task volume">
          {top10.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 30)}>
              <BarChart data={top10} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
                <XAxis type="number" stroke="#7A6E61" style={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="displayName" stroke="#7A6E61" style={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipNumber} />
                <Bar dataKey="taskCount" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Avg time to finish (hours)" subtitle="Across tasks where finished_at is populated">
          {top10.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={Math.max(280, top10.length * 30)}>
              <BarChart data={top10} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
                <XAxis type="number" stroke="#7A6E61" style={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="displayName" stroke="#7A6E61" style={{ fontSize: 11 }} width={130} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={(v) => fmtHours(typeof v === 'number' ? v : Number(v))} />
                <Bar dataKey="avgTimeToFinishHours" fill={COLORS.warning} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Team detail" subtitle="Created-by employee — task volume, finish rate, avg time, cost generated">
        {rows.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                <tr>
                  <th className="text-left py-2 px-2">Employee</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Tasks</th>
                  <th className="text-right py-2 px-2">Finished</th>
                  <th className="text-right py-2 px-2">Avg time</th>
                  <th className="text-right py-2 px-2">Total cost</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={`${e.employeeId ?? 'none'}-${e.displayName}`} className="border-b border-[#E0DBD4]/40 hover:bg-mvr-cream">
                    <td className="py-2 px-2 font-medium text-mvr-olive">{e.displayName}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${e.active ? 'bg-mvr-success-light text-mvr-success' : 'bg-mvr-neutral text-muted-foreground'}`}>
                        {e.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">{formatNumber(e.taskCount)}</td>
                    <td className="py-2 px-2 text-right text-mvr-success">{formatNumber(e.finishedCount)}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{fmtHours(e.avgTimeToFinishHours)}</td>
                    <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(e.totalCost)}</td>
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
