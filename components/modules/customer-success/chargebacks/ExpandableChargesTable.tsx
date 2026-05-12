'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  X,
  AlertTriangle,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ChargeDetailRow, type ChargeDetailData } from './ChargeDetailRow'
import { extractChargeMeta } from './charge-metadata'
import { computeCases } from './charge-grouping'

export type ExpandableCharge = ChargeDetailData

interface Props {
  charges: ExpandableCharge[]
  loading: boolean
  error: string | null
  selectedReasons: string[]
  channel: string
  onChannelChange: (v: string) => void
}

type SortKey = 'date' | 'guest' | 'amount' | 'risk' | 'status' | 'reason' | 'attempts'
type SortDir = 'asc' | 'desc'

const PAGE_SIZE = 25
const RISK_RANK: Record<string, number> = { highest: 3, elevated: 2, normal: 1 }

function humanReason(r: string | null): string {
  if (!r) return '—'
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function riskBadge(level: string | null) {
  if (level === 'highest') return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  if (level === 'elevated') return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
  return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
}

function statusBadge(s: string) {
  if (s === 'succeeded') return 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
  if (s === 'failed') return 'bg-mvr-danger-light text-mvr-danger border-mvr-danger/30'
  return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
}

export function ExpandableChargesTable({
  charges,
  loading,
  error,
  selectedReasons,
  channel,
  onChannelChange,
}: Props) {
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [chargeTypeFilter, setChargeTypeFilter] = useState<string>('')
  const [propertyFilter, setPropertyFilter] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(1)

  // Reset state when upstream charges change.
  const datasetKey = useMemo(
    () => `${selectedReasons.join(',')}::${charges.length}`,
    [selectedReasons, charges.length]
  )
  useEffect(() => {
    setExpandedKey(null)
    setPage(1)
    setChargeTypeFilter('')
    setPropertyFilter('')
  }, [datasetKey])

  // Build cases (each row = one case; singletons + groups together).
  const cases = useMemo(() => computeCases(charges), [charges])

  // Decorate each case with primary metadata for filter/sort lookups.
  const decorated = useMemo(
    () =>
      cases.map((cs) => ({
        cs,
        meta: extractChargeMeta(cs.primary.raw),
      })),
    [cases]
  )

  const { chargeTypes, properties } = useMemo(() => {
    const types = new Set<string>()
    const props = new Set<string>()
    for (const { meta } of decorated) {
      if (meta.chargeType) types.add(meta.chargeType)
      if (meta.property) props.add(meta.property)
    }
    return {
      chargeTypes: Array.from(types).sort(),
      properties: Array.from(props).sort(),
    }
  }, [decorated])

  const filtered = useMemo(() => {
    return decorated.filter(({ meta }) => {
      if (chargeTypeFilter && meta.chargeType !== chargeTypeFilter) return false
      if (propertyFilter && meta.property !== propertyFilter) return false
      return true
    })
  }, [decorated, chargeTypeFilter, propertyFilter])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    arr.sort((a, b) => {
      const cmp = (() => {
        switch (sortKey) {
          case 'date':
            return a.cs.lastAttempt.getTime() - b.cs.lastAttempt.getTime()
          case 'guest':
            return (a.cs.guestName ?? '').localeCompare(b.cs.guestName ?? '')
          case 'amount':
            return a.cs.totalCents - b.cs.totalCents
          case 'risk':
            return (RISK_RANK[a.cs.maxRiskLevel ?? ''] ?? 0) - (RISK_RANK[b.cs.maxRiskLevel ?? ''] ?? 0)
          case 'status':
            return a.cs.primary.status.localeCompare(b.cs.primary.status)
          case 'reason':
            return (a.cs.primary.outcomeReason ?? '').localeCompare(b.cs.primary.outcomeReason ?? '')
          case 'attempts':
            return a.cs.count - b.cs.count
          default:
            return 0
        }
      })()
      return sortDir === 'asc' ? cmp : -cmp
    })
    return arr
  }, [filtered, sortKey, sortDir])

  useEffect(() => {
    setPage(1)
    setExpandedKey(null)
  }, [chargeTypeFilter, propertyFilter, sortKey, sortDir])

  const totalRows = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Roll-up metrics across the FULL filtered set (so users see the picture even when paginating).
  const repeatStats = useMemo(() => {
    let groups = 0
    let groupedCharges = 0
    let groupedAmount = 0
    for (const { cs } of filtered) {
      if (cs.isGroup) {
        groups++
        groupedCharges += cs.count
        groupedAmount += cs.totalCents
      }
    }
    return { groups, groupedCharges, groupedAmount }
  }, [filtered])

  function toggle(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

  function changeSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'date' || key === 'amount' || key === 'risk' || key === 'attempts' ? 'desc' : 'asc')
    }
  }

  const title =
    selectedReasons.length > 0
      ? `matching ${selectedReasons.map((r) => humanReason(r)).join(', ')}`
      : 'recent elevated & highest-risk'

  const hasActiveFilters = chargeTypeFilter !== '' || propertyFilter !== ''

  return (
    <div className="space-y-3">
      {/* Repeat-pattern roll-up banner */}
      {repeatStats.groups > 0 && (
        <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-mvr-danger-light border border-mvr-danger/30">
          <AlertTriangle className="w-4 h-4 text-mvr-danger mt-0.5 shrink-0" />
          <div className="text-xs">
            <strong className="text-mvr-danger font-semibold">
              {repeatStats.groups} repeat pattern{repeatStats.groups === 1 ? '' : 's'}
            </strong>
            <span className="text-mvr-olive">
              {' '}— {repeatStats.groupedCharges} charges totaling {formatCurrency(repeatStats.groupedAmount / 100)} across guests with 2+ attempts. Sort by{' '}
              <button
                type="button"
                onClick={() => {
                  setSortKey('attempts')
                  setSortDir('desc')
                }}
                className="underline font-medium hover:text-mvr-danger"
              >
                attempts
              </button>{' '}
              to surface them first.
            </span>
          </div>
        </div>
      )}

      {/* Header row: count + Slack channel input */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${totalRows.toLocaleString()} case${totalRows === 1 ? '' : 's'} · ${title}`}
        </p>
        <div className="flex-1" />
        <input
          type="text"
          value={channel}
          onChange={(e) => onChannelChange(e.target.value)}
          placeholder="Slack channel ID (for Notify CX)"
          className="text-xs border border-[#E0DBD4] rounded-md px-3 py-1.5 min-w-[240px] focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
      </div>

      {/* Filter bar */}
      <div className="bg-mvr-cream/60 border border-[#E0DBD4] rounded-lg p-3 flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
          Filter
        </span>
        <select
          value={chargeTypeFilter}
          onChange={(e) => setChargeTypeFilter(e.target.value)}
          className="text-xs border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none min-w-[180px]"
        >
          <option value="">All charge types</option>
          {chargeTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          className="text-xs border border-[#E0DBD4] rounded-md px-3 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none min-w-[220px]"
        >
          <option value="">All properties</option>
          {properties.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setChargeTypeFilter('')
              setPropertyFilter('')
            }}
            className="inline-flex items-center gap-1 text-xs text-mvr-primary hover:underline"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-mvr-danger/30 bg-mvr-danger-light p-3 text-xs text-mvr-danger">
          {error}
        </div>
      )}

      {totalRows === 0 && !loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
          No charges match this filter.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border border-[#E0DBD4] rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="py-2.5 pl-4 w-10"></th>
                  <SortableTh label="Latest" k="date" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} />
                  <SortableTh label="Guest / Reservation" k="guest" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} />
                  <SortableTh label="Attempts" k="attempts" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} align="right" />
                  <SortableTh label="Amount" k="amount" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} align="right" />
                  <SortableTh label="Risk" k="risk" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} />
                  <SortableTh label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} />
                  <SortableTh label="Reason" k="reason" sortKey={sortKey} sortDir={sortDir} onClick={changeSort} className="pr-3" />
                </tr>
              </thead>
              <tbody>
                {pageRows.map(({ cs, meta }) => {
                  const isOpen = expandedKey === cs.key
                  const guestDisplay = cs.guestName ?? '—'
                  const primary = cs.primary
                  const confirmation = meta.confirmationCode ?? primary.bookingId ?? null
                  return (
                    <Fragment key={cs.key}>
                      <tr
                        onClick={() => toggle(cs.key)}
                        className={`border-b border-[#E0DBD4] last:border-b-0 transition-colors cursor-pointer ${isOpen ? 'bg-mvr-primary-light' : cs.isGroup ? 'hover:bg-mvr-danger-light/40' : 'hover:bg-mvr-neutral/40'}`}
                      >
                        <td className="py-2.5 pl-4">
                          <ChevronRight
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          />
                        </td>
                        <td className="py-2.5 px-2 text-mvr-olive whitespace-nowrap">
                          {formatDate(cs.lastAttempt)}
                        </td>
                        <td className="py-2.5 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-mvr-primary font-medium text-sm">{guestDisplay}</span>
                            {cs.isGroup && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-mvr-danger-light text-mvr-danger border border-mvr-danger/30"
                                title={`${cs.count} attempts from this guest/card`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                ×{cs.count}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-mvr-olive">
                            {confirmation ? (
                              <span className="font-mono">{confirmation}</span>
                            ) : (
                              <span className="text-muted-foreground italic">no confirmation</span>
                            )}
                            {cs.cardLast4 && (
                              <span className="font-mono text-muted-foreground"> · •••• {cs.cardLast4}</span>
                            )}
                            {meta.property && (
                              <span className="text-muted-foreground"> · {meta.property}</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {cs.isGroup ? (
                            <span className="font-display text-mvr-danger">×{cs.count}</span>
                          ) : (
                            <span className="text-muted-foreground">1</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-right text-mvr-primary font-display">
                          {formatCurrency(cs.totalCents / 100, primary.currency.toUpperCase())}
                          {cs.isGroup && (
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                              total
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${riskBadge(cs.maxRiskLevel)}`}
                          >
                            {cs.maxRiskLevel ?? 'n/a'}
                          </span>
                          {cs.isGroup && cs.highestRiskCount > 0 && (
                            <div className="text-[10px] text-mvr-danger mt-0.5">
                              {cs.highestRiskCount} highest
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2">
                          {cs.isGroup ? (
                            <div className="text-[11px] text-mvr-olive leading-tight">
                              {cs.succeededCount > 0 && (
                                <div className="text-mvr-success">{cs.succeededCount} succeeded</div>
                              )}
                              {cs.failedCount > 0 && (
                                <div className="text-mvr-danger">{cs.failedCount} failed</div>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusBadge(primary.status)}`}
                            >
                              {primary.status}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-mvr-olive">
                          {humanReason(primary.outcomeReason)}
                          {meta.chargeType && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">{meta.chargeType}</div>
                          )}
                        </td>
                      </tr>
                      {isOpen && (
                        <tr>
                          <td colSpan={8} className="p-0">
                            <ChargeDetailRow
                              charge={primary}
                              channel={channel || 'C098R8ZMZTL'}
                              groupChargeIds={cs.isGroup ? cs.attempts.map((c) => c.id) : undefined}
                            />
                            {cs.isGroup && (
                              <div className="bg-mvr-cream/60 border-t border-[#E0DBD4] px-6 pt-4 pb-5">
                                <div className="text-[10px] uppercase tracking-widest font-semibold text-mvr-primary mb-2">
                                  All {cs.count} attempts in this pattern
                                </div>
                                <div className="border border-[#E0DBD4] rounded-md overflow-hidden bg-white">
                                  <table className="w-full text-xs">
                                    <thead>
                                      <tr className="bg-mvr-cream/80 border-b border-[#E0DBD4] text-[9px] uppercase tracking-widest text-muted-foreground">
                                        <th className="py-1.5 px-2 text-left">Date</th>
                                        <th className="py-1.5 px-2 text-left">Charge ID</th>
                                        <th className="py-1.5 px-2 text-right">Amount</th>
                                        <th className="py-1.5 px-2 text-left">Risk</th>
                                        <th className="py-1.5 px-2 text-left">Status</th>
                                        <th className="py-1.5 px-2 text-left">Reason</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {cs.attempts.map((a, i) => (
                                        <tr
                                          key={a.id}
                                          className={`border-b border-[#E0DBD4] last:border-b-0 ${i === 0 ? 'bg-mvr-primary-light/60' : ''}`}
                                        >
                                          <td className="py-1.5 px-2 text-mvr-olive whitespace-nowrap">
                                            {formatDate(a.createdAt)}
                                            {i === 0 && (
                                              <span className="ml-1 text-[9px] uppercase tracking-widest text-mvr-primary font-semibold">
                                                latest
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-1.5 px-2 font-mono text-[10px] text-muted-foreground">
                                            {a.id}
                                          </td>
                                          <td className="py-1.5 px-2 text-right font-display text-mvr-primary">
                                            {formatCurrency(a.amountCents / 100, a.currency.toUpperCase())}
                                          </td>
                                          <td className="py-1.5 px-2">
                                            <span
                                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${riskBadge(a.riskLevel)}`}
                                            >
                                              {a.riskLevel ?? 'n/a'}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2">
                                            <span
                                              className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider border ${statusBadge(a.status)}`}
                                            >
                                              {a.status}
                                            </span>
                                          </td>
                                          <td className="py-1.5 px-2 text-mvr-olive">
                                            {humanReason(a.outcomeReason)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic mt-2">
                                  Detail above shows the latest attempt. Action buttons cover all {cs.count} attempts.
                                </p>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing{' '}
                <strong className="text-mvr-primary font-medium">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRows)}
                </strong>{' '}
                of <strong className="text-mvr-primary font-medium">{totalRows}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <span className="text-mvr-primary font-medium">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface ThProps {
  label: string
  k: SortKey
  sortKey: SortKey
  sortDir: SortDir
  onClick: (k: SortKey) => void
  align?: 'left' | 'right'
  className?: string
}

function SortableTh({ label, k, sortKey, sortDir, onClick, align = 'left', className = '' }: ThProps) {
  const active = sortKey === k
  const Icon = active ? (sortDir === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown
  return (
    <th className={`py-2.5 px-2 ${className}`}>
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`group inline-flex items-center gap-1 ${align === 'right' ? 'justify-end w-full' : ''} ${active ? 'text-mvr-primary' : 'hover:text-mvr-primary'}`}
      >
        <span className="uppercase tracking-widest text-[10px] font-semibold">{label}</span>
        <Icon className={`w-3 h-3 ${active ? 'text-mvr-primary' : 'text-muted-foreground/40 group-hover:text-muted-foreground'}`} />
      </button>
    </th>
  )
}
