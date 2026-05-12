'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts'
import type { RiskSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  data: RiskSummary['monthly']
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthlyTrendChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No disputes in this period.
      </div>
    )
  }

  const chartData = data.map((m) => {
    const [, mm] = m.month.split('-')
    const idx = Number(mm) - 1
    return {
      label: MONTH_LABELS[idx] ?? m.month,
      won: m.won,
      lost: m.lost,
      pending: m.pending,
      amount: m.amountCents / 100,
    }
  })

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E0DBD4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={{ stroke: '#E0DBD4' }} tickLine={false} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
          />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => {
              const n = Number(value ?? 0)
              if (name === 'amount') return [formatCurrency(n), 'Amount']
              return [String(n), String(name)]
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            iconType="square"
          />
          <Bar yAxisId="left" dataKey="won" stackId="status" name="Won" fill="#2D6A4F" />
          <Bar yAxisId="left" dataKey="lost" stackId="status" name="Lost" fill="#8B2030" />
          <Bar yAxisId="left" dataKey="pending" stackId="status" name="Pending" fill="#CEC4B6" />
          <Line yAxisId="right" type="monotone" dataKey="amount" name="amount" stroke="#1E2D40" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
