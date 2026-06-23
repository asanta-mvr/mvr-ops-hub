'use client'

// Overview tab — flagship summary. KPIs + status donut + priority donut +
// top subdepts + cost by bill-to + monthly volume.
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  AlertCircle,
  CheckCircle,
  ClipboardList,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { KpiCard } from '../KpiCard'
import { ChartCard } from '../ChartCard'
import {
  BILL_TO_COLORS,
  COLORS,
  PRIORITY_COLORS,
  STAGE_COLORS,
  STAGE_LABELS,
  formatCurrency,
  formatMinutes,
  formatNumber,
  formatPercent,
  tooltipNumber,
} from '../format'
import type {
  MaintenanceFilterOptions,
  MaintenanceFilters,
  OverviewAggregate,
} from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     OverviewAggregate
  filterOptions: MaintenanceFilterOptions
}

function titleCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function OverviewTab({ filters, aggregate, filterOptions }: Props) {
  const k = aggregate.kpis
  const coverage = k.totalTasks > 0 ? k.tasksWithCostCount / k.totalTasks : null

  const statusData = aggregate.statusDonut.map((d) => ({
    name:  STAGE_LABELS[d.stage] ?? d.stage,
    value: d.count,
    color: STAGE_COLORS[d.stage] ?? COLORS.sand,
  }))

  const priorityData = aggregate.priorityDonut.map((d) => ({
    name:  titleCase(d.priority),
    value: d.count,
    color: PRIORITY_COLORS[d.priority.toLowerCase()] ?? COLORS.sand,
  }))

  const subdeptData = aggregate.topSubdepts.map((s) => ({
    name:      s.name,
    taskCount: s.taskCount,
    totalCost: s.totalCost,
  }))

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="ov_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Total tasks"
          value={formatNumber(k.totalTasks)}
          sub={k.completionRate == null ? undefined : `${formatPercent(k.completionRate)} completion`}
          icon={Wrench}
          accent="primary"
        />
        <KpiCard
          label="Total cost"
          value={formatCurrency(k.totalCost)}
          sub={coverage == null ? undefined : `Coverage ${formatPercent(coverage)}`}
          icon={DollarSign}
          accent="success"
        />
        <KpiCard
          label="Avg cost / task"
          value={k.avgCostPerTask == null ? '—' : formatCurrency(k.avgCostPerTask)}
          sub={`${formatNumber(k.tasksWithCostCount)} tasks with cost`}
          icon={TrendingUp}
          accent="primary"
        />
        <KpiCard
          label="Avg resolution"
          value={k.avgResolutionMin == null ? '—' : formatMinutes(k.avgResolutionMin)}
          icon={Clock}
          accent="steel"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Material cost" value={formatCurrency(k.totalMaterial)}
          sub={k.totalCost > 0 ? `${formatPercent(k.totalMaterial / k.totalCost)} of total` : undefined}
          icon={DollarSign} accent="sand" />
        <KpiCard label="Labor cost" value={formatCurrency(k.totalLabor)}
          sub={k.totalCost > 0 ? `${formatPercent(k.totalLabor / k.totalCost)} of total` : undefined}
          icon={Users} accent="steel" />
        <KpiCard label="Finished" value={formatNumber(k.statusMix.find((s) => s.stage === 'finished')?.count ?? 0)}
          icon={CheckCircle} accent="success" />
        <KpiCard label="Open / New" value={formatNumber(k.statusMix.find((s) => s.stage === 'new')?.count ?? 0)}
          icon={AlertCircle} accent="warning" />
      </div>

      <ChartCard title="Total cost by Bill-to" subtitle="Who is being charged for the maintenance">
        <BillToBreakdown rows={aggregate.byBillTo} total={k.totalCost} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Tasks by status" subtitle="Stage distribution of every task in scope">
          {statusData.length === 0 ? (
            <Empty message="No tasks match the current filters." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} label={(e) => `${e.name}: ${e.value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Tasks by priority" subtitle="Priority distribution">
          {priorityData.length === 0 ? (
            <Empty message="No tasks match the current filters." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={2} label={(e) => `${e.name}: ${e.value}`}>
                  {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Top 10 subdepartments" subtitle="Volume of tasks per maintenance subdept">
        {subdeptData.length === 0 ? (
          <Empty message="No subdepartments in current scope." />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(220, subdeptData.length * 30)}>
            <BarChart data={subdeptData} layout="vertical" margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis type="number" stroke="#7A6E61" style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#7A6E61" style={{ fontSize: 11 }} width={140} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipNumber} />
              <Bar dataKey="taskCount" fill={COLORS.primary} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Monthly volume" subtitle="Tasks created per month">
        {aggregate.volume.length === 0 ? (
          <Empty message="No volume data in scope." />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={aggregate.volume.map((v) => ({ month: v.bucket, count: v.count }))} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis dataKey="month" stroke="#7A6E61" style={{ fontSize: 11 }} />
              <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r: 4, fill: COLORS.primary }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  )
}

function BillToBreakdown({ rows, total }: { rows: Array<{ billTo: string; taskCount: number; totalCost: number }>; total: number }) {
  if (rows.length === 0 || total === 0) return <Empty message="No cost data in scope." />
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const pct = total > 0 ? r.totalCost / total : 0
        const color = BILL_TO_COLORS[r.billTo.toLowerCase()] ?? COLORS.sand
        return (
          <div key={r.billTo}>
            <div className="flex items-center justify-between mb-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm" style={{ background: color }} />
                <span className="font-medium text-mvr-olive">{titleCase(r.billTo)}</span>
                <span className="text-muted-foreground">({formatNumber(r.taskCount)} tasks)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-mvr-olive font-mono">{formatCurrency(r.totalCost)}</span>
                <span className="text-muted-foreground w-12 text-right">{formatPercent(pct)}</span>
              </div>
            </div>
            <div className="w-full bg-mvr-neutral rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Empty({ message }: { message: string }) {
  return <div className="py-12 text-center text-sm text-muted-foreground"><ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" /> {message}</div>
}
