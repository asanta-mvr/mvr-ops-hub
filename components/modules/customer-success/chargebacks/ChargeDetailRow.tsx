'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, Send, ShieldPlus, User, Home, CreditCard, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { extractChargeMeta } from './charge-metadata'

export interface ChargeDetailData {
  id: string
  paymentIntent: string | null
  customerId: string | null
  bookingId: string | null
  amountCents: number
  currency: string
  status: string
  riskLevel: string | null
  riskScore: number | null
  outcomeReason: string | null
  livemode: boolean
  createdAt: Date | string
  raw: unknown
}

interface Props {
  charge: ChargeDetailData
  channel: string
  // When set, "Notify CX" sends an alert covering ALL these chargeIds (e.g. repeat group).
  // Defaults to [charge.id] when undefined.
  groupChargeIds?: string[]
}

function humanReason(r: string | null): string {
  if (!r) return '—'
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function ChargeDetailRow({ charge, channel, groupChargeIds }: Props) {
  const targetIds = groupChargeIds && groupChargeIds.length > 0 ? groupChargeIds : [charge.id]
  const isGroupNotify = targetIds.length > 1
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [addingToWatchlist, setAddingToWatchlist] = useState(false)

  const meta = extractChargeMeta(charge.raw)
  const guestName = meta.guestName ?? '—'
  const email = meta.email ?? '—'
  const reservation = meta.confirmationCode ?? charge.bookingId ?? '—'
  const property = meta.property ?? '—'
  const chargeType = meta.chargeType ?? '—'
  const cardDisplay = meta.cardLast4
    ? `${meta.cardBrand ? meta.cardBrand.charAt(0).toUpperCase() + meta.cardBrand.slice(1) : 'Card'} •••• ${meta.cardLast4}${meta.cardCountry ? ` (${meta.cardCountry})` : ''}`
    : '—'
  const sellerMsg = meta.sellerMessage
  const networkStatus = meta.networkStatus
  const cardLast4 = meta.cardLast4
  const cardFunding = meta.cardFunding

  const stripePath = charge.livemode ? 'payments' : 'test/payments'
  const stripeUrl = `https://dashboard.stripe.com/${stripePath}/${charge.id}`

  async function notifyCx() {
    if (!channel.trim()) {
      toast.error('Set a Slack channel ID first')
      return
    }
    setSending(true)
    try {
      const message = isGroupNotify
        ? `🚨 Repeat attempts pattern: ${guestName} — ${targetIds.length} charges (${humanReason(charge.outcomeReason)}). Card ${meta.cardLast4 ? `•••• ${meta.cardLast4}` : '(no card)'}.`
        : `Charge ${charge.id} (${humanReason(charge.outcomeReason)}) — guest ${guestName}`
      const res = await fetch('/api/v1/risk/notify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chargeIds: targetIds,
          channel: channel.trim(),
          priority: isGroupNotify ? 'p1' : 'high',
          message,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to send alert')
        return
      }
      toast.success(isGroupNotify ? `Alert sent for ${targetIds.length} charges` : 'Alert sent to CX')
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    } finally {
      setSending(false)
    }
  }

  async function addToWatchlist() {
    if (!email && !cardLast4) {
      toast.error('No email or card last 4 to add')
      return
    }
    setAddingToWatchlist(true)
    try {
      const res = await fetch('/api/v1/risk/watchlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email !== '—' ? email : undefined,
          cardLast4: cardLast4 ?? undefined,
          reason: `Auto-add from charge ${charge.id} (${humanReason(charge.outcomeReason)})`,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Could not add')
        return
      }
      toast.success('Added to watchlist')
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Network error')
    } finally {
      setAddingToWatchlist(false)
    }
  }

  return (
    <div className="bg-mvr-cream/60 border-t border-[#E0DBD4] px-6 py-5">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Guest */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
            <User className="w-3 h-3 text-mvr-sand" />
            Guest
          </div>
          <div className="text-sm text-mvr-primary font-medium">{guestName}</div>
          <div className="text-xs text-mvr-olive break-all">{email}</div>
        </div>

        {/* Reservation */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
            <Home className="w-3 h-3 text-mvr-sand" />
            Reservation
          </div>
          <div className="text-sm text-mvr-primary font-medium">{reservation}</div>
          <div className="text-xs text-mvr-olive">{property}</div>
          <div className="text-[11px] text-muted-foreground">{chargeType}</div>
        </div>

        {/* Card */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
            <CreditCard className="w-3 h-3 text-mvr-sand" />
            Card
          </div>
          <div className="text-sm text-mvr-primary font-medium">{cardDisplay}</div>
          {cardFunding && (
            <div className="text-[11px] text-muted-foreground capitalize">{cardFunding}</div>
          )}
          <div className="text-[11px] text-mvr-olive">
            {formatCurrency(charge.amountCents / 100, charge.currency.toUpperCase())}
          </div>
        </div>

        {/* Risk */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-semibold text-mvr-primary">
            <Activity className="w-3 h-3 text-mvr-sand" />
            Risk
          </div>
          <div className="text-sm text-mvr-primary font-medium">
            {charge.riskLevel ?? 'n/a'}
            {charge.riskScore !== null && (
              <span className="text-muted-foreground font-normal"> · score {charge.riskScore}</span>
            )}
          </div>
          {sellerMsg && (
            <div className="text-xs text-mvr-olive italic">&ldquo;{sellerMsg}&rdquo;</div>
          )}
          {networkStatus && (
            <div className="text-[11px] text-muted-foreground">{networkStatus.replace(/_/g, ' ')}</div>
          )}
        </div>
      </div>

      {/* Identifiers row */}
      <div className="mt-4 pt-3 border-t border-[#E0DBD4] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono text-muted-foreground">
        <div>
          <span className="text-[9px] uppercase tracking-widest font-sans not-italic font-semibold text-mvr-primary mr-1.5">Charge</span>
          {charge.id}
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest font-sans not-italic font-semibold text-mvr-primary mr-1.5">PaymentIntent</span>
          {charge.paymentIntent ?? '—'}
        </div>
        <div>
          <span className="text-[9px] uppercase tracking-widest font-sans not-italic font-semibold text-mvr-primary mr-1.5">Customer</span>
          {charge.customerId ?? '—'}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-[#E0DBD4] flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted-foreground">{formatDate(charge.createdAt)}</span>
        <div className="flex-1" />
        <a
          href={stripeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Open in Stripe
        </a>
        <button
          type="button"
          onClick={addToWatchlist}
          disabled={addingToWatchlist || (email === '—' && !cardLast4)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ShieldPlus className="w-3.5 h-3.5" />
          {addingToWatchlist ? 'Adding…' : 'Add to watchlist'}
        </button>
        <button
          type="button"
          onClick={notifyCx}
          disabled={sending}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${isGroupNotify ? 'bg-mvr-danger hover:bg-mvr-danger/90' : 'bg-mvr-primary hover:bg-mvr-primary/90'}`}
        >
          <Send className="w-3.5 h-3.5" />
          {sending
            ? 'Sending…'
            : isGroupNotify
              ? `Notify CX about all ${targetIds.length}`
              : 'Notify CX'}
        </button>
      </div>
    </div>
  )
}
