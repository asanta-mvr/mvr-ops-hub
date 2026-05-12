'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PaymentsSummary } from '@/lib/risk/queries'
import { formatCurrency } from '@/lib/utils/format'

interface Props {
  data: PaymentsSummary['monthly']
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function MonthlyVolumeChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No transactions in this period.
      </div>
    )
  }

  const chartData = data.map((m) => {
    const [, mm] = m.month.split('-')
    const idx = Number(mm) - 1
    return {
      label: MONTH_LABELS[idx] ?? m.month,
      succeeded: m.succeeded,
      failed: m.failed,
      volume: m.volumeCents / 100,
      failRate: Number(m.failRatePct.toFixed(2)),
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
            tickFormatter={(v: number) => `${v.toFixed(0)}%`}
          />
          <Tooltip
            contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => {
              const n = Number(value ?? 0)
              if (name === 'failRate') return [`${n.toFixed(1)}%`, 'Fail rate']
              if (name === 'volume') return [formatCurrency(n), 'Volume']
              return [n.toLocaleString(), name === 'succeeded' ? 'Succeeded' : 'Failed']
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="square" />
          <Bar yAxisId="left" dataKey="succeeded" stackId="status" name="Succeeded" fill="#2D6A4F" />
          <Bar yAxisId="left" dataKey="failed" stackId="status" name="Failed" fill="#8B2030" />
          <Line yAxisId="right" type="monotone" dataKey="failRate" name="failRate" stroke="#8B2030" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
