'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { X, Loader2 } from 'lucide-react'
import { z } from 'zod'

const schema = z.object({
  source:           z.enum(['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']),
  subject:          z.string().min(1, 'Required'),
  body:             z.string().min(1, 'Required'),
  fromEmail:        z.string().email('Enter a valid email'),
  guestName:        z.string().optional(),
  confirmationCode: z.string().optional(),
  buildingId:       z.string().optional(),
  assignedToId:     z.string().optional(),
})

type FormValues = z.infer<typeof schema>

type Building = { id: string; name: string }
type Agent    = { id: string; name: string | null }

interface CreateTicketModalProps {
  buildings: Building[]
  agents:    Agent[]
  onClose:   () => void
}

const OTA_OPTIONS = [
  { value: 'airbnb',   label: 'Airbnb' },
  { value: 'booking',  label: 'Booking.com' },
  { value: 'vrbo',     label: 'VRBO' },
  { value: 'expedia',  label: 'Expedia' },
  { value: 'vacasa',   label: 'Vacasa' },
  { value: 'other',    label: 'Other' },
]

export function CreateTicketModal({ buildings, agents, onClose }: CreateTicketModalProps) {
  const router  = useRouter()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: standardSchemaResolver(schema),
    defaultValues: { source: 'airbnb' },
  })

  async function onSubmit(data: FormValues) {
    setError(null)
    try {
      const res = await fetch('/api/v1/tickets', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
      })
      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to create ticket')
        return
      }
      router.refresh()
      onClose()
    } catch {
      setError('Network error — please try again')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-panel mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-mvr-cream">
          <h2 className="text-lg font-semibold text-mvr-primary">New Ticket</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-mvr-neutral transition-colors text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">

          {/* Row: OTA + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">OTA Source *</label>
              <select
                {...register('source')}
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              >
                {OTA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Assigned To</label>
              <select
                {...register('assignedToId')}
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              >
                <option value="">Unassigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name ?? a.id}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Subject *</label>
            <input
              {...register('subject')}
              type="text"
              placeholder="e.g. Guest complaint about noise"
              className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            />
            {errors.subject && <p className="text-xs text-mvr-danger">{errors.subject.message}</p>}
          </div>

          {/* Row: Guest + Confirmation Code */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Guest Name</label>
              <input
                {...register('guestName')}
                type="text"
                placeholder="John Doe"
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Confirmation Code</label>
              <input
                {...register('confirmationCode')}
                type="text"
                placeholder="HMABCD123"
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              />
            </div>
          </div>

          {/* Row: Email + Building */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Contact Email *</label>
              <input
                {...register('fromEmail')}
                type="email"
                placeholder="guest@example.com"
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              />
              {errors.fromEmail && <p className="text-xs text-mvr-danger">{errors.fromEmail.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Building</label>
              <select
                {...register('buildingId')}
                className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
              >
                <option value="">— None —</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Description *</label>
            <textarea
              {...register('body')}
              rows={4}
              placeholder="Describe the issue or ticket details…"
              className="w-full text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary resize-none"
            />
            {errors.body && <p className="text-xs text-mvr-danger">{errors.body.message}</p>}
          </div>

          {error && (
            <p className="text-sm text-mvr-danger bg-mvr-danger-light px-3 py-2 rounded-lg">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-medium border border-[#E0DBD4] rounded-lg hover:bg-mvr-neutral transition-colors text-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 text-sm font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
