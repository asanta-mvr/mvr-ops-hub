'use client'

import { Building2, Tag, ShieldAlert, Calendar, CalendarRange, ChevronDown } from 'lucide-react'
import type { RiskLevelFilter } from '@/lib/risk/queries'
import { MultiSelectFilter } from './MultiSelectFilter'

const RISK_LEVEL_OPTIONS: Array<{ value: RiskLevelFilter; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'elevated', label: 'Elevated' },
  { value: 'highest', label: 'Highest' },
]

const MONTHS: Array<{ value: string; label: string }> = [
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
  /** Months (1-12) that actually have transactions in the selected year.
   *  Empty when no year is selected. The dropdown only renders months in
   *  this list so users can't pick empty periods. */
  availableMonths: number[]
  buildings: string[]
  selectedBuildings: string[]
  chargeTypes: string[]
  selectedChargeTypes: string[]
  selectedRiskLevels: RiskLevelFilter[]
  isPending: boolean
  hasFilter: boolean
  onYearChange: (value: string) => void
  onMonthChange: (value: string) => void
  onBuildingsChange: (values: string[]) => void
  onChargeTypesChange: (values: string[]) => void
  onRiskLevelsChange: (values: string[]) => void
  onClear: () => void
}

export function PeriodFilterBar({
  years,
  year,
  month,
  availableMonths,
  buildings,
  selectedBuildings,
  chargeTypes,
  selectedChargeTypes,
  selectedRiskLevels,
  isPending,
  hasFilter,
  onYearChange,
  onMonthChange,
  onBuildingsChange,
  onChargeTypesChange,
  onRiskLevelsChange,
  onClear,
}: Props) {
  const availableMonthSet = new Set(availableMonths)
  const monthsForYear = year ? MONTHS.filter((m) => availableMonthSet.has(Number(m.value))) : []
  return (
    <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card p-4 flex flex-wrap items-center gap-3">
      <span className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
        Scope
      </span>

      {/* Building — multi */}
      <MultiSelectFilter
        icon={Building2}
        allLabel="All buildings"
        itemNoun="building"
        ariaLabel="Filter by buildings"
        options={buildings.map((b) => ({ value: b, label: b }))}
        selected={selectedBuildings}
        onChange={onBuildingsChange}
        minWidth="180px"
      />

      {/* Charge Type — multi */}
      <MultiSelectFilter
        icon={Tag}
        allLabel="All charge types"
        itemNoun="charge type"
        ariaLabel="Filter by charge types"
        options={chargeTypes.map((t) => ({ value: t, label: t }))}
        selected={selectedChargeTypes}
        onChange={onChargeTypesChange}
        minWidth="170px"
      />

      {/* Risk Level — multi */}
      <MultiSelectFilter
        icon={ShieldAlert}
        allLabel="All risk levels"
        itemNoun="risk level"
        ariaLabel="Filter by risk levels"
        options={RISK_LEVEL_OPTIONS}
        selected={selectedRiskLevels}
        onChange={onRiskLevelsChange}
        minWidth="160px"
      />

      {/* Year — single */}
      <label className="relative inline-flex items-center">
        <Calendar
          className={`absolute left-2.5 w-4 h-4 pointer-events-none transition-colors ${
            year ? 'text-mvr-primary' : 'text-mvr-sand'
          }`}
          aria-hidden
        />
        <select
          value={year ? String(year) : ''}
          onChange={(e) => onYearChange(e.target.value)}
          aria-label="Filter by year"
          className={`appearance-none text-sm border rounded-md pl-8 pr-8 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none min-w-[120px] transition-colors ${
            year ? 'border-mvr-primary text-mvr-primary font-medium' : 'border-[#E0DBD4]'
          }`}
        >
          <option value="">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
      </label>

      {/* Month — fifth. Disabled when no year is selected (month without year is ambiguous). */}
      <label className="relative inline-flex items-center">
        <CalendarRange
          className={`absolute left-2.5 w-4 h-4 pointer-events-none transition-colors ${
            month ? 'text-mvr-primary' : 'text-mvr-sand'
          }`}
          aria-hidden
        />
        <select
          value={month ? String(month) : ''}
          onChange={(e) => onMonthChange(e.target.value)}
          disabled={!year || monthsForYear.length === 0}
          aria-label="Filter by month"
          className={`appearance-none text-sm border rounded-md pl-8 pr-8 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none min-w-[140px] transition-colors ${
            month ? 'border-mvr-primary text-mvr-primary font-medium' : 'border-[#E0DBD4]'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <option value="">All months</option>
          {monthsForYear.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-2 w-4 h-4 text-muted-foreground pointer-events-none"
          aria-hidden
        />
      </label>

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
