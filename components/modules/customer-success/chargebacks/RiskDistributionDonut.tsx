'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import type { PaymentsSummary } from '@/lib/risk/queries'

interface Props {
  data: PaymentsSummary['riskDistribution']
}

const LABELS: Record<PaymentsSummary['riskDistribution'][number]['level'], string> = {
  normal: 'Normal',
  elevated: 'Elevated',
  highest: 'Highest',
}

const COLORS: Record<PaymentsSummary['riskDistribution'][number]['level'], string> = {
  normal: '#2D6A4F',
  elevated: '#B5541C',
  highest: '#8B2030',
}

export function RiskDistributionDonut({ data }: Props) {
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
    .map((d) => ({ name: LABELS[d.level], value: d.count, level: d.level }))

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
              <Cell key={d.level} fill={COLORS[d.level as keyof typeof COLORS]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="font-display text-2xl text-mvr-primary leading-none">{total.toLocaleString()}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Charges</p>
      </div>
      <div className="mt-2 flex justify-center gap-4 text-xs flex-wrap">
        {chartData.map((d) => (
          <div key={d.level} className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[d.level as keyof typeof COLORS] }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="font-medium text-mvr-primary">{d.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
