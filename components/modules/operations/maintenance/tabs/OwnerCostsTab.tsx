'use client'

// Owner Costs tab — cost split by bill-to, material vs labor, monthly evolution.
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { ClipboardList } from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { ChartCard } from '../ChartCard'
import { KpiCard } from '../KpiCard'
import { BILL_TO_COLORS, COLORS, MATERIAL_LABOR_COLORS, formatCurrency, formatNumber, formatPercent, tooltipCurrency } from '../format'
import type { MaintenanceFilterOptions, MaintenanceFilters, OwnerCostsAggregate } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  aggregate:     OwnerCostsAggregate
  filterOptions: MaintenanceFilterOptions
}

function titleCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function OwnerCostsTab({ filters, aggregate, filterOptions }: Props) {
  const k = aggregate.kpis

  const billToPie = aggregate.byBillTo.map((r) => ({
    name:  titleCase(r.billTo),
    value: r.totalCost,
    color: BILL_TO_COLORS[r.billTo.toLowerCase()] ?? COLORS.sand,
  }))

  const billToStack = aggregate.byBillTo.map((r) => ({
    name:     titleCase(r.billTo),
    material: r.materialCost,
    labor:    r.laborCost,
  }))

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="cost_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total cost" value={formatCurrency(k.totalCost)} accent="success" />
        <KpiCard label="Material" value={formatCurrency(k.totalMaterial)}
          sub={k.totalCost > 0 ? formatPercent(k.totalMaterial / k.totalCost) : undefined} accent="sand" />
        <KpiCard label="Labor" value={formatCurrency(k.totalLabor)}
          sub={k.totalCost > 0 ? formatPercent(k.totalLabor / k.totalCost) : undefined} accent="steel" />
        <KpiCard label="Avg cost / task" value={k.avgCostPerTask == null ? '—' : formatCurrency(k.avgCostPerTask)} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Cost distribution by bill-to" subtitle="Owner / internal / damage / etc.">
          {billToPie.length === 0 || billToPie.every((b) => b.value === 0) ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={billToPie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={100} paddingAngle={2}
                  label={(e) => `${e.name}: ${formatCurrency(e.value)}`}>
                  {billToPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Material vs labor by bill-to" subtitle="Stacked by source — owner vs internal vs others">
          {billToStack.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={billToStack} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
                <XAxis dataKey="name" stroke="#7A6E61" style={{ fontSize: 11 }} />
                <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="material" stackId="a" fill={MATERIAL_LABOR_COLORS.material} name="Material" />
                <Bar dataKey="labor"    stackId="a" fill={MATERIAL_LABOR_COLORS.labor}    name="Labor" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Avg cost per unit — top 10 buildings" subtitle="For owner reporting — total maintenance ÷ distinct units">
        {aggregate.avgCostPerUnitByBuilding.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={aggregate.avgCostPerUnitByBuilding} margin={{ top: 10, right: 20, bottom: 60, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EBE6DE" />
              <XAxis dataKey="building" stroke="#7A6E61" style={{ fontSize: 10 }} angle={-20} textAnchor="end" height={80} />
              <YAxis stroke="#7A6E61" style={{ fontSize: 11 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8 }} formatter={tooltipCurrency} />
              <Bar dataKey="avgCostPerUnit" fill={COLORS.success} radius={[4, 4, 0, 0]} name="Avg cost / unit" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Monthly material vs labor" subtitle="Stacked area — cost evolution over time">
        {aggregate.monthlyMaterialLabor.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={aggregate.monthlyMaterialLabor} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
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

      <ChartCard title="Bill-to detail" subtitle="Tasks and cost split by who pays">
        {aggregate.byBillTo.length === 0 ? <Empty /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                <tr>
                  <th className="text-left py-2 px-2">Bill-to</th>
                  <th className="text-right py-2 px-2">Tasks</th>
                  <th className="text-right py-2 px-2">Total cost</th>
                  <th className="text-right py-2 px-2">Material</th>
                  <th className="text-right py-2 px-2">Labor</th>
                  <th className="text-right py-2 px-2">% of total</th>
                </tr>
              </thead>
              <tbody>
                {aggregate.byBillTo.map((b) => (
                  <tr key={b.billTo} className="border-b border-[#E0DBD4]/40 hover:bg-mvr-cream">
                    <td className="py-2 px-2 font-medium text-mvr-olive">{titleCase(b.billTo)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(b.taskCount)}</td>
                    <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(b.totalCost)}</td>
                    <td className="py-2 px-2 text-right text-[#6B5B95]">{formatCurrency(b.materialCost)}</td>
                    <td className="py-2 px-2 text-right text-[#3C8DAD]">{formatCurrency(b.laborCost)}</td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{k.totalCost > 0 ? formatPercent(b.totalCost / k.totalCost) : '—'}</td>
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
