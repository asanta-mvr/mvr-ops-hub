'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { ChargeDetailRow } from './ChargeDetailRow'

export interface RefundRow {
  chargeId: string
  refundId: string | null
  refundAmountCents: number
  refundReason: string | null
  refundedAt: Date | string
  customerId: string | null
  bookingId: string | null
  amountCents: number
  currency: string
  status: string
  livemode: boolean
  chargeCreatedAt: Date | string
  raw: unknown
}

interface Props {
  initial: RefundRow[]
  selectedReasons: string[]
  year?: number
  month?: number
}

function humanReason(r: string | null): string {
  if (!r) return 'Unknown / not captured'
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RefundsTable({ initial, selectedReasons, year, month }: Props) {
  const [channel, setChannel] = useState('')
  const [rows, setRows] = useState<RefundRow[]>(initial)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filterKey = useMemo(
    () => `${year ?? 'all'}-${month ?? 'all'}-${[...selectedReasons].sort().join(',')}`,
    [year, month, selectedReasons]
  )

  useEffect(() => {
    if (selectedReasons.length === 0) {
      setRows(initial)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    params.set('reasons', selectedReasons.join(','))
    params.set('limit', '50')
    fetch(`/api/v1/risk/refunds?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setRows([])
        } else {
          setRows(
            (json.data as RefundRow[]).map((r) => ({
              ...r,
              refundedAt: new Date(r.refundedAt as string),
              chargeCreatedAt: new Date(r.chargeCreatedAt as string),
            }))
          )
        }
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setError('Failed to load refunds')
        setRows([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs text-muted-foreground">
          {loading
            ? 'Loading…'
            : `${rows.length} refund${rows.length === 1 ? '' : 's'}${selectedReasons.length > 0 ? ` · ${selectedReasons.map((r) => humanReason(r)).join(', ')}` : ''}`}
        </p>
        <div className="flex-1" />
        <input
          type="text"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Slack channel ID (for Notify CX)"
          className="text-xs border border-[#E0DBD4] rounded-md px-3 py-1.5 min-w-[240px] focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-mvr-danger/30 bg-mvr-danger-light p-3 text-xs text-mvr-danger">
          {error}
        </div>
      )}

      {rows.length === 0 && !loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground border border-dashed border-[#E0DBD4] rounded-lg">
          No refunds match this filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#E0DBD4] rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2.5 pl-4 w-10"></th>
                <th className="py-2.5 px-2 text-left">Refunded</th>
                <th className="py-2.5 px-2 text-left">Charge / Customer</th>
                <th className="py-2.5 px-2 text-right">Refund</th>
                <th className="py-2.5 px-2 text-right">Charge total</th>
                <th className="py-2.5 px-3 text-left">Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const key = `${r.chargeId}::${r.refundId ?? 'whole'}`
                const isOpen = expanded.has(key)
                return (
                  <Fragment key={key}>
                    <tr
                      onClick={() => toggle(key)}
                      className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-neutral/40 transition-colors cursor-pointer"
                    >
                      <td className="py-2.5 pl-4">
                        <ChevronRight
                          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-mvr-olive whitespace-nowrap">
                        {formatDate(r.refundedAt)}
                      </td>
                      <td className="py-2.5 px-2 text-mvr-olive">
                        <div className="font-mono text-[10px] text-mvr-primary">{r.chargeId}</div>
                        <div className="font-mono text-[10px] text-muted-foreground">{r.customerId ?? '—'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-right text-mvr-warning font-display">
                        {formatCurrency(r.refundAmountCents / 100, r.currency.toUpperCase())}
                      </td>
                      <td className="py-2.5 px-2 text-right text-mvr-primary font-display">
                        {formatCurrency(r.amountCents / 100, r.currency.toUpperCase())}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-mvr-olive">{humanReason(r.refundReason)}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={6} className="p-0">
                          <ChargeDetailRow
                            channel={channel || 'C098R8ZMZTL'}
                            charge={{
                              id: r.chargeId,
                              paymentIntent: null,
                              customerId: r.customerId,
                              bookingId: r.bookingId,
                              amountCents: r.amountCents,
                              currency: r.currency,
                              status: r.status,
                              riskLevel: null,
                              riskScore: null,
                              outcomeReason: r.refundReason,
                              livemode: r.livemode,
                              createdAt: r.chargeCreatedAt,
                              raw: r.raw,
                            }}
                          />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
