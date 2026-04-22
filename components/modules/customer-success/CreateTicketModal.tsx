'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { X, Loader2, Search, CheckCircle, AlertCircle } from 'lucide-react'
import { z } from 'zod'
import type { OtaSource } from '@prisma/client'

const schema = z.object({
  source:           z.enum(['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']),
  subject:          z.string().min(1, 'Required'),
  body:             z.string().min(1, 'Required'),
  fromEmail:        z.string().email('Enter a valid email'),
  guestName:        z.string().optional(),
  guestPhone:       z.string().optional(),
  confirmationCode: z.string().optional(),
  checkinDate:      z.string().optional(),
  checkoutDate:     z.string().optional(),
  category:         z.string().optional(),
  buildingId:       z.string().optional(),
  unitId:           z.string().optional(),
  assignedToId:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Building = { id: string; name: string }
type Agent    = { id: string; name: string | null }
type Unit     = { id: string; number: string; building: { name: string } | null }

interface CreateTicketModalProps {
  buildings: Building[]
  agents:    Agent[]
  units:     Unit[]
  onClose:   () => void
}

const CATEGORY_OPTIONS = ['Refund', 'Penalty', 'Cancellation']

const SUBCATEGORY_OPTIONS = [
  'Noise Complaint',
  'Damage Claim',
  'Refund Request',
  'Early Check-in',
  'Late Check-out',
  'Cleanliness Issue',
  'Amenity Issue',
  'Billing Dispute',
  'Guest Dispute',
  'Maintenance Issue',
]

const OTA_OPTIONS: { value: OtaSource; label: string }[] = [
  { value: 'airbnb',   label: 'Airbnb' },
  { value: 'booking',  label: 'Booking.com' },
  { value: 'vrbo',     label: 'VRBO' },
  { value: 'expedia',  label: 'Expedia' },
  { value: 'vacasa',   label: 'Vacasa' },
  { value: 'other',    label: 'Other' },
]

export function CreateTicketModal({ buildings, agents: _agents, units, onClose }: CreateTicketModalProps) {
  const router = useRouter()

  const [lookupCode,   setLookupCode]   = useState('')
  const [lookupState,  setLookupState]  = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')
  const [lookupLabel,  setLookupLabel]  = useState<{ property: string; unit: string } | null>(null)
  const [autoFilled,   setAutoFilled]   = useState(false)
  const [submitError,  setSubmitError]  = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { source: 'airbnb' },
  })

  async function handleLookup() {
    if (!lookupCode.trim()) return
    setLookupState('loading')
    setAutoFilled(false)
    try {
      const res = await fetch(`/api/v1/reservations/lookup?confirmationCode=${encodeURIComponent(lookupCode.trim())}`)
      const json = await res.json()
      if (!res.ok || !json.data) {
        setLookupState('not_found')
        return
      }
      const d = json.data
      setValue('confirmationCode', lookupCode.trim())
      if (d.source)       setValue('source',      d.source)
      if (d.guestName)    setValue('guestName',   d.guestName)
      if (d.guestPhone)   setValue('guestPhone',  d.guestPhone)
      if (d.checkinDate)  setValue('checkinDate',  d.checkinDate.slice(0, 10))
      if (d.checkoutDate) setValue('checkoutDate', d.checkoutDate.slice(0, 10))
      setLookupLabel(d.property ? { property: d.property, unit: d.unit ?? '' } : null)
      setLookupState('found')
      setAutoFilled(true)
    } catch {
      setLookupState('not_found')
    }
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null)
    try {
      const res = await fetch('/api/v1/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, confirmationCode: lookupCode.trim() || data.confirmationCode }),
      })
      const json = await res.json()
      if (!res.ok) {
        setSubmitError(json.error ?? 'Failed to create ticket')
        return
      }
      if (json.created === false) {
        setSubmitError('Este código de confirmación ya tiene un ticket asociado.')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setSubmitError('Network error — please try again')
    }
  }

  const inputBase = 'w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary'
  const readonlyInput = `${inputBase} bg-mvr-cream text-gray-500 cursor-default`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-panel mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-mvr-cream">
          <h2 className="text-lg font-semibold text-mvr-primary">New Ticket</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-mvr-neutral transition-colors text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4 max-h-[78vh] overflow-y-auto">

          {/* 1. Confirmation Code + Look up */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Confirmation Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={lookupCode}
                onChange={(e) => { setLookupCode(e.target.value); setLookupState('idle'); setAutoFilled(false) }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup() } }}
                placeholder="e.g. HMABCD123"
                className={`flex-1 text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary ${lookupState === 'found' ? 'border-green-300 bg-green-50' : ''}`}
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={!lookupCode.trim() || lookupState === 'loading'}
                className="flex items-center gap-1.5 px-3 py-2 bg-mvr-primary text-white text-sm rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors shrink-0"
              >
                {lookupState === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Look up
              </button>
            </div>
            {lookupState === 'found' && (
              <p className="flex items-center gap-1.5 text-xs text-green-600">
                <CheckCircle className="w-3.5 h-3.5" />
                Reservation found — fields auto-filled
                {lookupLabel && <span className="text-gray-500">({lookupLabel.property}{lookupLabel.unit ? ` · Unit ${lookupLabel.unit}` : ''})</span>}
              </p>
            )}
            {lookupState === 'not_found' && (
              <p className="flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="w-3.5 h-3.5" />
                No reservation found — fill fields manually
              </p>
            )}
          </div>

          <hr className="border-[#E0DBD4]" />

          {/* 2. Guest Name | Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Guest Name</label>
              <input
                {...register('guestName')}
                type="text"
                placeholder="John Doe"
                readOnly={autoFilled && !!watch('guestName')}
                className={autoFilled && watch('guestName') ? readonlyInput : inputBase}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Phone</label>
              <input
                {...register('guestPhone')}
                type="text"
                placeholder="+1 (305) 000-0000"
                readOnly={autoFilled && !!watch('guestPhone')}
                className={autoFilled && watch('guestPhone') ? readonlyInput : inputBase}
              />
            </div>
          </div>

          {/* 3. Check-in | Check-out */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Check-in</label>
              <input
                {...register('checkinDate')}
                type="date"
                readOnly={autoFilled && !!watch('checkinDate')}
                className={autoFilled && watch('checkinDate') ? readonlyInput : inputBase}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Check-out</label>
              <input
                {...register('checkoutDate')}
                type="date"
                readOnly={autoFilled && !!watch('checkoutDate')}
                className={autoFilled && watch('checkoutDate') ? readonlyInput : inputBase}
              />
            </div>
          </div>

          {/* 4. Contact Email * | OTA Source */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Contact Email *</label>
              <input {...register('fromEmail')} type="email" placeholder="guest@example.com" className={inputBase} />
              {errors.fromEmail && <p className="text-xs text-mvr-danger">{errors.fromEmail.message}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">OTA Source *</label>
              <select
                {...register('source')}
                disabled={autoFilled}
                className={autoFilled ? readonlyInput : inputBase}
              >
                {OTA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Building | Unit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Building</label>
              <select {...register('buildingId')} className={inputBase}>
                <option value="">— None —</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Unit</label>
              <select {...register('unitId')} className={inputBase}>
                <option value="">— None —</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.building ? `${u.building.name} · ${u.number}` : u.number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <hr className="border-[#E0DBD4]" />

          {/* 6. Category — select fijo */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Category</label>
            <select {...register('category')} className={inputBase}>
              <option value="">— Select category —</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 7. Subcategory (stored as subject) — combobox */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Subcategory *</label>
            <input
              {...register('subject')}
              list="subcategory-options"
              type="text"
              placeholder="e.g. Noise Complaint, Refund Request…"
              className={inputBase}
              autoComplete="off"
            />
            <datalist id="subcategory-options">
              {SUBCATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.subject && <p className="text-xs text-mvr-danger">{errors.subject.message}</p>}
          </div>

          {/* 8. Description */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Description *</label>
            <textarea {...register('body')} rows={4} placeholder="Describe the issue…" className={`${inputBase} resize-none`} />
            {errors.body && <p className="text-xs text-mvr-danger">{errors.body.message}</p>}
          </div>

          {submitError && (
            <p className="text-sm text-mvr-danger bg-mvr-danger-light px-3 py-2 rounded-lg">{submitError}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium border border-[#E0DBD4] rounded-lg hover:bg-mvr-neutral transition-colors text-gray-700">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
