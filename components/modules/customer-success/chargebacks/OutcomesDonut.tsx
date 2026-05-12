'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { RiskSummary } from '@/lib/risk/queries'

interface Props {
  data: RiskSummary['outcomes']
}

const LABELS: Record<RiskSummary['outcomes'][number]['status'], string> = {
  won: 'Won',
  lost: 'Lost',
  pending: 'Pending',
}

const COLORS: Record<RiskSummary['outcomes'][number]['status'], string> = {
  won: '#2D6A4F',
  lost: '#8B2030',
  pending: '#CEC4B6',
}

export function OutcomesDonut({ data }: Props) {
  const total = data.reduce((acc, d) => acc + d.count, 0)
  if (total === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No data in this period.
      </div>
    )
  }

  const chartData = data
    .filter((d) => d.count > 0)
    .map((d) => ({ name: LABELS[d.status], value: d.count, status: d.status }))

  return (
    <div className="h-64 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={88}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((d) => (
              <Cell key={d.status} fill={COLORS[d.status as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="font-display text-2xl text-mvr-primary leading-none">{total}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Cases</p>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs">
        {chartData.map((d) => (
          <div key={d.status} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[d.status as keyof typeof COLORS] }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium text-mvr-primary">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
