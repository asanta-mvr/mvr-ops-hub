'use client'

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

interface Props {
  years: number[]
  year?: number
  month?: number
  isPending: boolean
  hasFilter: boolean
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
  onClear: () => void
}

export function PeriodFilterBar({
  years,
  year,
  month,
  isPending,
  hasFilter,
  onYearChange,
  onMonthChange,
  onClear,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-4 flex flex-wrap items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
        Period
      </span>
      <select
        value={year ? String(year) : ''}
        onChange={(e) => onYearChange(e.target.value)}
        className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
      >
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <select
        value={month ? String(month) : ''}
        onChange={(e) => onMonthChange(e.target.value)}
        disabled={!year}
        className="text-sm border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">All months</option>
        {MONTHS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
      {hasFilter && (
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-mvr-primary hover:underline"
        >
          Clear
        </button>
      )}
      {isPending && (
        <span className="text-xs text-muted-foreground ml-auto">Loading…</span>
      )}
    </div>
  )
}
