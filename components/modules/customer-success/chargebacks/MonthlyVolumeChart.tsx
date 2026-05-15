'use client'

import {
  Bar,
  CartesianGrid,
  Cell,
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
  /** 1-12, the month currently filtered globally (highlighted on the chart). */
  selectedMonth?: number
  /** Year currently in scope — used so a click can build the full year-month key. */
  year?: number
  /** Fired when the user clicks a month bar. Receives 1-12. Pass undefined to clear. */
  onSelectMonth?: (month: number | undefined) => void
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SUCCEEDED_FILL = '#2D6A4F'
const FAILED_FILL = '#8B2030'
const DIMMED_OPACITY = 0.32

export function MonthlyVolumeChart({ data, selectedMonth, year, onSelectMonth }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No transactions in this period.
      </div>
    )
  }

  const interactive = typeof onSelectMonth === 'function'

  const chartData = data.map((m) => {
    const [yy, mm] = m.month.split('-')
    const idx = Number(mm) - 1
    return {
      label: MONTH_LABELS[idx] ?? m.month,
      monthNum: Number(mm),
      yearNum: Number(yy),
      succeeded: m.succeeded,
      failed: m.failed,
      volume: m.volumeCents / 100,
      failRate: Number(m.failRatePct.toFixed(2)),
    }
  })

  function handleChartClick(state: unknown) {
    if (!interactive) return
    if (!state || typeof state !== 'object') return
    const idx = (state as { activeTooltipIndex?: number }).activeTooltipIndex
    if (typeof idx !== 'number' || idx < 0 || idx >= chartData.length) return
    const clicked = chartData[idx]
    if (!clicked) return
    // If user clicks the currently-selected month, clear the filter.
    if (selectedMonth === clicked.monthNum && year === clicked.yearNum) {
      onSelectMonth?.(undefined)
    } else {
      onSelectMonth?.(clicked.monthNum)
    }
  }

  return (
    <div className={`h-72 w-full ${interactive ? 'cursor-pointer select-none' : ''}`}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          onClick={handleChartClick}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0DBD4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={(tickProps: unknown) => {
              const p = tickProps as { x: number | string; y: number | string; payload: { value: string } }
              const px = typeof p.x === 'number' ? p.x : Number(p.x)
              const py = typeof p.y === 'number' ? p.y : Number(p.y)
              const monthIdx = MONTH_LABELS.indexOf(p.payload.value) + 1
              const isActive = selectedMonth === monthIdx
              return (
                <text
                  x={px}
                  y={py + 14}
                  textAnchor="middle"
                  fill={isActive ? '#1E2D40' : '#6b7280'}
                  fontWeight={isActive ? 700 : 400}
                  fontSize={isActive ? 12 : 11}
                >
                  {p.payload.value}
                </text>
              )
            }}
            axisLine={{ stroke: '#E0DBD4' }}
            tickLine={false}
          />
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
            cursor={{ fill: 'rgba(30, 45, 64, 0.06)' }}
            contentStyle={{ background: '#fff', border: '1px solid #E0DBD4', borderRadius: 8, fontSize: 12 }}
            formatter={(value, name) => {
              const n = Number(value ?? 0)
              if (name === 'failRate') return [`${n.toFixed(1)}%`, 'Fail rate']
              if (name === 'volume') return [formatCurrency(n), 'Volume']
              return [n.toLocaleString(), name === 'succeeded' ? 'Succeeded' : 'Failed']
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} iconType="square" />
          <Bar yAxisId="left" dataKey="succeeded" stackId="status" name="Succeeded">
            {chartData.map((entry) => (
              <Cell
                key={`s-${entry.monthNum}`}
                fill={SUCCEEDED_FILL}
                fillOpacity={
                  selectedMonth === undefined || selectedMonth === entry.monthNum ? 1 : DIMMED_OPACITY
                }
              />
            ))}
          </Bar>
          <Bar yAxisId="left" dataKey="failed" stackId="status" name="Failed">
            {chartData.map((entry) => (
              <Cell
                key={`f-${entry.monthNum}`}
                fill={FAILED_FILL}
                fillOpacity={
                  selectedMonth === undefined || selectedMonth === entry.monthNum ? 1 : DIMMED_OPACITY
                }
              />
            ))}
          </Bar>
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="failRate"
            name="failRate"
            stroke="#8B2030"
            strokeWidth={2}
            dot={{ r: 4 }}
            strokeDasharray="4 2"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
