'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Info, X } from 'lucide-react'
import type { PaymentsSummary } from '@/lib/risk/queries'
import { DECLINE_REASON_DESCRIPTIONS, describeReason, humanizeReason } from '@/lib/risk/decline-reasons'

interface Props {
  data: PaymentsSummary['declineReasons']
  selected: string[]
  onChange: (next: string[]) => void
}

// '(unknown)' stays non-filterable (NULL outcomeReason can't be expressed in
// the existing reasons IN filter). '(other)' is filterable via its members.
const NON_FILTERABLE = new Set(['(unknown)'])

export function ClickableDeclineReasons({ data, selected, onChange }: Props) {
  const [glossaryOpen, setGlossaryOpen] = useState(false)
  const glossaryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!glossaryOpen) return
    function onDocClick(e: MouseEvent) {
      if (!glossaryRef.current) return
      if (!glossaryRef.current.contains(e.target as Node)) setGlossaryOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setGlossaryOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [glossaryOpen])

  if (data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
        No failed charges in this period.
      </div>
    )
  }

  const total = data.reduce((sum, r) => sum + r.count, 0)
  const maxCount = Math.max(...data.map((r) => r.count))
  const rows = [...data].sort((a, b) => b.count - a.count)
  const hasSelection = selected.length > 0
  const selectedSet = new Set(selected)

  // For the '(other)' row we treat it as "selected" only when ALL its members
  // are in the selected array. Toggle adds/removes the whole member set.
  function isRowSelected(row: PaymentsSummary['declineReasons'][number]): boolean {
    if (row.reason === '(other)' && row.members && row.members.length > 0) {
      return row.members.every((m) => selectedSet.has(m))
    }
    return selectedSet.has(row.reason)
  }

  function toggleRow(row: PaymentsSummary['declineReasons'][number]) {
    if (NON_FILTERABLE.has(row.reason)) return
    if (row.reason === '(other)' && row.members && row.members.length > 0) {
      const allActive = row.members.every((m) => selectedSet.has(m))
      if (allActive) {
        // Remove all members.
        onChange(selected.filter((s) => !row.members!.includes(s)))
      } else {
        // Add any missing members.
        const additions = row.members.filter((m) => !selectedSet.has(m))
        onChange([...selected, ...additions])
      }
      return
    }
    if (selectedSet.has(row.reason)) {
      onChange(selected.filter((r) => r !== row.reason))
    } else {
      onChange([...selected, row.reason])
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {total.toLocaleString()} failed charge{total === 1 ? '' : 's'} · click a row to filter
            the table below
          </span>
          <div className="relative" ref={glossaryRef}>
            <button
              type="button"
              onClick={() => setGlossaryOpen((v) => !v)}
              aria-label="What does each reason mean?"
              aria-expanded={glossaryOpen}
              className={`inline-flex items-center justify-center w-5 h-5 rounded-full border transition-colors ${
                glossaryOpen
                  ? 'bg-mvr-primary border-mvr-primary text-white'
                  : 'border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream'
              }`}
            >
              <Info className="w-3 h-3" aria-hidden />
            </button>
            {glossaryOpen && (
              <div
                role="dialog"
                aria-label="Decline reason glossary"
                className="absolute z-50 top-full left-0 mt-2 w-[min(420px,calc(100vw-2rem))] max-h-[420px] overflow-y-auto bg-white border border-[#E0DBD4] rounded-lg shadow-panel"
              >
                <div className="sticky top-0 bg-white border-b border-[#E0DBD4] px-4 py-2.5 flex items-center justify-between">
                  <h4 className="font-display text-sm text-mvr-primary">
                    What does each reason mean?
                  </h4>
                  <button
                    type="button"
                    onClick={() => setGlossaryOpen(false)}
                    aria-label="Close glossary"
                    className="p-1 rounded text-muted-foreground hover:text-mvr-primary hover:bg-mvr-neutral"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <dl className="px-4 py-3 space-y-3">
                  {rows.map((r) => (
                    <div key={`g-${r.reason}`} className="space-y-0.5">
                      <dt className="text-sm font-semibold text-mvr-primary flex items-baseline gap-2">
                        <span>{humanizeReason(r.reason)}</span>
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-normal">
                          {r.count.toLocaleString()}
                        </span>
                      </dt>
                      <dd className="text-[12px] text-mvr-olive leading-relaxed">
                        {describeReason(r.reason)}
                        {r.reason === '(other)' && r.members && r.members.length > 0 && (
                          <div className="mt-1 text-[11px] text-muted-foreground">
                            Includes:{' '}
                            {r.members
                              .map((m) => humanizeReason(m))
                              .join(', ')}
                          </div>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="border-t border-[#E0DBD4] px-4 py-2.5 text-[10px] text-muted-foreground">
                  Definitions follow Stripe&apos;s{' '}
                  <a
                    href="https://stripe.com/docs/declines/codes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mvr-primary hover:underline"
                  >
                    decline_code reference
                  </a>
                  .
                </div>
              </div>
            )}
          </div>
        </div>
        {hasSelection && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-mvr-primary hover:underline text-xs"
          >
            Clear ({selected.length})
          </button>
        )}
      </div>

      {/* Rows */}
      <div className="border border-[#E0DBD4] rounded-lg overflow-hidden divide-y divide-[#E0DBD4]">
        {rows.map((r) => {
          const isSelected = isRowSelected(r)
          const filterable = !NON_FILTERABLE.has(r.reason)
          const pct = total === 0 ? 0 : (r.count / total) * 100
          const barPct = maxCount === 0 ? 0 : (r.count / maxCount) * 100
          const description = DECLINE_REASON_DESCRIPTIONS[r.reason]
          return (
            <button
              key={r.reason}
              type="button"
              onClick={() => toggleRow(r)}
              aria-pressed={isSelected}
              aria-disabled={!filterable || undefined}
              title={
                filterable
                  ? description ?? `Filter by ${humanizeReason(r.reason)}`
                  : 'Unknown bucket — not filterable'
              }
              className={[
                'w-full grid grid-cols-[20px_minmax(180px,220px)_1fr_auto_auto] gap-3 items-center px-3 py-2 text-left transition-colors',
                isSelected
                  ? 'bg-mvr-primary-light'
                  : filterable
                    ? 'bg-white hover:bg-mvr-cream/60'
                    : 'bg-mvr-cream/40 cursor-default',
              ].join(' ')}
            >
              {/* Checkbox */}
              <span
                aria-hidden
                className={[
                  'inline-flex items-center justify-center w-4 h-4 rounded-sm border transition-colors',
                  isSelected
                    ? 'bg-mvr-primary border-mvr-primary text-white'
                    : filterable
                      ? 'border-[#E0DBD4] bg-white'
                      : 'border-transparent bg-transparent',
                ].join(' ')}
              >
                {isSelected && <Check className="w-3 h-3" strokeWidth={3} />}
              </span>

              {/* Reason label */}
              <span
                className={[
                  'text-sm truncate',
                  isSelected
                    ? 'text-mvr-primary font-medium'
                    : filterable
                      ? 'text-mvr-primary'
                      : 'text-muted-foreground italic',
                ].join(' ')}
              >
                {humanizeReason(r.reason)}
                {r.reason === '(other)' && r.members && (
                  <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">
                    ({r.members.length})
                  </span>
                )}
              </span>

              {/* Bar */}
              <div className="bg-mvr-neutral rounded-full h-2 overflow-hidden">
                <div
                  className={[
                    'h-full rounded-full transition-all',
                    isSelected
                      ? 'bg-mvr-primary'
                      : filterable
                        ? 'bg-mvr-danger'
                        : 'bg-mvr-steel',
                  ].join(' ')}
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {/* Count */}
              <span className="font-display text-sm whitespace-nowrap tabular-nums text-mvr-primary">
                {r.count.toLocaleString()}
              </span>

              {/* Percent */}
              <span className="text-[11px] text-muted-foreground font-mono whitespace-nowrap tabular-nums w-12 text-right">
                {pct.toFixed(1)}%
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
