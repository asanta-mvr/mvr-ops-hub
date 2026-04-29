'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Plus, Check, X } from 'lucide-react'

const formSchema = z.object({
  name:           z.string().min(1, 'Building name is required').max(200),
  nickname:       z.string().min(1, 'Nickname is required').max(100),
  status:         z.enum(['active', 'inactive', 'onboarding']),
  zone:           z.string().min(1, 'Zone is required').max(100),
  address:        z.string().min(1, 'Address is required').max(500),
  zipcode:        z.string().min(1, 'Zip code is required').max(20),
  lat:            z.string().optional(),
  long:           z.string().optional(),
  googleUrl:      z.string().optional(),
  website:        z.string().optional(),
  imageUrl:       z.string().optional(),
  driveFolderUrl: z.string().optional(),
  frontdeskPhone: z.string().max(30).optional(),
  frontdeskEmail: z.string().optional(),
  checkinHours:   z.string().max(100).optional(),
  checkoutHours:  z.string().max(100).optional(),
  frontdeskHours: z.string().max(100).optional(),
  amenities:      z.array(z.string()),
  rules:          z.string().optional(),
  knowledgeBase:  z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface BuildingFormProps {
  buildingId?:    string
  defaultValues?: Partial<FormValues>
  zones?:         string[]
}

// ── Shared micro-components ────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground mb-1">
      {children}{required && <span className="text-mvr-danger ml-0.5">*</span>}
    </label>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs text-mvr-danger mt-1">{message}</p>
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className: _cls, ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary disabled:bg-gray-50 disabled:text-gray-400"
      />
    )
  }
)

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className: _cls, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary resize-y min-h-[80px]"
      />
    )
  }
)

const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className: _cls, ...props }, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary bg-white"
      />
    )
  }
)

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

// ── Zone selector: dropdown + inline "add new zone" ───────────────────────

function ZoneSelect({
  zones,
  value,
  onChange,
  error,
}: {
  zones:    string[]
  value:    string
  onChange: (v: string) => void
  error?:   string
}) {
  const [addingNew, setAddingNew]   = useState(false)
  const [newZoneName, setNewZoneName] = useState('')

  const knownZones  = Array.from(new Set(zones.filter(Boolean)))
  const isCustomVal = value && !knownZones.includes(value)

  function confirmNew() {
    const trimmed = newZoneName.trim()
    if (!trimmed) return
    onChange(trimmed)
    setAddingNew(false)
    setNewZoneName('')
  }

  if (addingNew) {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={newZoneName}
          onChange={(e) => setNewZoneName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmNew() } }}
          placeholder="New neighborhood name"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
        />
        <button
          type="button"
          onClick={confirmNew}
          className="px-3 py-2 bg-mvr-primary text-white rounded-lg text-sm hover:bg-mvr-primary/90 transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setAddingNew(false); setNewZoneName('') }}
          className="px-3 py-2 border rounded-lg text-sm hover:bg-mvr-neutral transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <>
      <Select
        value={isCustomVal ? value : (value || '')}
        onChange={(e) => {
          if (e.target.value === '__add_new__') {
            setAddingNew(true)
          } else {
            onChange(e.target.value)
          }
        }}
      >
        <option value="">Select zone…</option>
        {knownZones.map((z) => (
          <option key={z} value={z}>{z}</option>
        ))}
        {isCustomVal && (
          <option value={value}>{value}</option>
        )}
        <option value="__add_new__">＋ Add new zone…</option>
      </Select>
      <FieldError message={error} />
    </>
  )
}

// ── Amenities ─────────────────────────────────────────────────────────────

const PRESET_AMENITIES = [
  'Pool', 'Heated Pool', 'Rooftop Pool', 'Hot Tub', 'Sauna', 'Steam Room', 'Spa',
  'Gym', 'Tennis Court', 'Racquetball', 'Golf Simulator',
  'Valet Parking', 'Self-Parking', 'EV Charging', 'Bike Storage',
  'Concierge', '24/7 Security', 'Doorman', 'Shuttle Service',
  'Rooftop Terrace', 'BBQ Area', 'Club Room', 'Party Room',
  'Business Center', 'Co-Working Space', 'Game Room', 'Screening Room',
  'Restaurant On-Site', 'Café', 'Wine Cellar',
  'Ocean View', 'Bay View', 'City View', 'Private Beach Access', 'Marina',
  'Pet Friendly', 'Dog Park',
  'In-Unit Laundry', 'Package Lockers', 'Storage Units', 'Kids Room',
]

function AmenitiesTagPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [customInput, setCustomInput] = useState('')

  function toggle(amenity: string) {
    if (value.includes(amenity)) {
      onChange(value.filter((a) => a !== amenity))
    } else {
      onChange([...value, amenity])
    }
  }

  function addCustom() {
    const trimmed = customInput.trim()
    if (!trimmed || value.includes(trimmed)) return
    onChange([...value, trimmed])
    setCustomInput('')
  }

  const customAmenities = value.filter((a) => !PRESET_AMENITIES.includes(a))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESET_AMENITIES.map((amenity) => {
          const selected = value.includes(amenity)
          return (
            <button
              key={amenity}
              type="button"
              onClick={() => toggle(amenity)}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selected
                  ? 'bg-mvr-primary text-white border-mvr-primary'
                  : 'bg-white text-mvr-olive border-[#E0DBD4] hover:border-mvr-primary hover:text-mvr-primary'
              }`}
            >
              {selected && <Check className="w-3 h-3" />}
              {amenity}
            </button>
          )
        })}
      </div>

      {customAmenities.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Custom amenities</p>
          <div className="flex flex-wrap gap-2">
            {customAmenities.map((amenity) => (
              <span
                key={amenity}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-mvr-primary text-white border border-mvr-primary"
              >
                {amenity}
                <button
                  type="button"
                  onClick={() => onChange(value.filter((a) => a !== amenity))}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Add custom amenity…"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
        />
        <button
          type="button"
          onClick={addCustom}
          disabled={!customInput.trim()}
          className="px-3 py-2 bg-mvr-primary text-white rounded-lg text-sm hover:bg-mvr-primary/90 transition-colors disabled:opacity-40"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ── Main form ──────────────────────────────────────────────────────────────

export default function BuildingForm({ buildingId, defaultValues, zones = [] }: BuildingFormProps) {
  const router    = useRouter()
  const [serverError, setServerError] = useState('')
  const isEdit    = !!buildingId

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      name:          '',
      nickname:      '',
      status:        'onboarding',
      zone:          '',
      address:       '',
      zipcode:       '',
      lat:           '',
      long:          '',
      googleUrl:     '',
      website:       '',
      imageUrl:      '',
      frontdeskPhone: '',
      frontdeskEmail: '',
      checkinHours:  '',
      checkoutHours: '',
      frontdeskHours: '',
      amenities:     [] as string[],
      rules:         '',
      knowledgeBase: '',
      driveFolderUrl: '',
      ...defaultValues,
    },
  })

  const zoneValue = watch('zone') ?? ''

  async function onSubmit(values: FormValues) {
    setServerError('')

    const { amenities, driveFolderUrl, lat, long, ...rest } = values

    const payload = {
      ...rest,
      amenities,
      floorplanUrls: driveFolderUrl ? [driveFolderUrl] : [],
      lat:            lat  ? parseFloat(lat)  : undefined,
      long:           long ? parseFloat(long) : undefined,
      googleUrl:      rest.googleUrl      || undefined,
      website:        rest.website        || undefined,
      imageUrl:       rest.imageUrl       || undefined,
      frontdeskPhone: rest.frontdeskPhone || undefined,
      frontdeskEmail: rest.frontdeskEmail || undefined,
      checkinHours:   rest.checkinHours   || undefined,
      checkoutHours:  rest.checkoutHours  || undefined,
      frontdeskHours: rest.frontdeskHours || undefined,
      rules:          rest.rules          || undefined,
      knowledgeBase:  rest.knowledgeBase  || undefined,
    }

    const url    = isEdit ? `/api/v1/buildings/${buildingId}` : '/api/v1/buildings'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const fieldErrors = data.details?.fieldErrors as Record<string, string[]> | undefined
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        for (const [field, msgs] of Object.entries(fieldErrors)) {
          setError(field as keyof FormValues, { message: msgs[0] })
        }
        const summary = Object.entries(fieldErrors)
          .map(([f, msgs]) => `${f}: ${msgs[0]}`)
          .join(' · ')
        setServerError(`Validation failed — ${summary}`)
      } else {
        setServerError(data.error ?? 'Something went wrong')
      }
      return
    }

    const data = await res.json()
    router.push(`/data-master/buildings/${data.data.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="bg-mvr-danger-light text-mvr-danger text-sm rounded-lg px-4 py-3">
          {serverError}
        </div>
      )}

      {/* ── Basic Info ── */}
      <SectionCard title="Basic Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Building Name</Label>
            <Input {...register('name')} placeholder="e.g. Icon Brickell" />
            <FieldError message={errors.name?.message} />
          </div>
          <div>
            <Label required>Nickname</Label>
            <Input {...register('nickname')} placeholder="e.g. ICON" />
            <FieldError message={errors.nickname?.message} />
          </div>
          <div>
            <Label required>Status</Label>
            <Select {...register('status')}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
          <div>
            <Label required>Zone</Label>
            <ZoneSelect
              zones={zones}
              value={zoneValue}
              onChange={(v) => setValue('zone', v, { shouldValidate: true })}
              error={errors.zone?.message}
            />
            <FieldError message={errors.zone?.message} />
          </div>
        </div>
        <div>
          <Label>Building Photo URL</Label>
          <Input {...register('imageUrl')} placeholder="https://…/photo.jpg" />
          <p className="text-xs text-muted-foreground mt-1">Main photo shown on the building card and detail page.</p>
        </div>
      </SectionCard>

      {/* ── Location ── */}
      <SectionCard title="Location">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label required>Address</Label>
            <Input {...register('address')} placeholder="485 Brickell Avenue" />
            <FieldError message={errors.address?.message} />
          </div>
          <div>
            <Label required>Zip Code</Label>
            <Input {...register('zipcode')} placeholder="33131" />
            <FieldError message={errors.zipcode?.message} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Latitude</Label>
            <Input
              {...register('lat')}
              placeholder="25.768458 — or paste 'lat, long'"
              type="text"
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text')
                if (pasted.includes(',')) {
                  e.preventDefault()
                  const [latPart, longPart] = pasted.split(',')
                  setValue('lat',  latPart.trim())
                  setValue('long', longPart.trim())
                }
              }}
            />
          </div>
          <div>
            <Label>Longitude</Label>
            <Input {...register('long')} placeholder="-80.188991" type="text" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Google Maps URL</Label>
            <Input {...register('googleUrl')} placeholder="https://maps.google.com/…" type="url" />
          </div>
          <div>
            <Label>Website</Label>
            <Input {...register('website')} placeholder="https://…" type="url" />
          </div>
        </div>
      </SectionCard>

      {/* ── Documents & Media ── */}
      <SectionCard title="Documents & Media">
        <p className="text-xs text-muted-foreground -mt-2 mb-3">
          Paste the Google Drive folder link where floorplans and building documents are stored. Anyone with the link will be able to view the files.
        </p>
        <div>
          <Label>Google Drive Folder URL</Label>
          <Input
            {...register('driveFolderUrl')}
            placeholder="https://drive.google.com/drive/folders/…"
            type="url"
          />
          <FieldError message={errors.driveFolderUrl?.message} />
        </div>
      </SectionCard>

      {/* ── Front Desk ── */}
      <SectionCard title="Front Desk">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input {...register('frontdeskPhone')} placeholder="+1 (305) 000-0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...register('frontdeskEmail')} placeholder="frontdesk@building.com" type="email" />
            <FieldError message={errors.frontdeskEmail?.message} />
          </div>
          <div>
            <Label>Check-in Hours</Label>
            <Input {...register('checkinHours')} placeholder="3:00 PM – 10:00 PM" />
          </div>
          <div>
            <Label>Check-out Hours</Label>
            <Input {...register('checkoutHours')} placeholder="By 11:00 AM" />
          </div>
          <div className="md:col-span-2">
            <Label>Hours of Operation</Label>
            <Input {...register('frontdeskHours')} placeholder="Mon–Fri 9am–5pm, Sat–Sun 10am–4pm" />
          </div>
        </div>
      </SectionCard>

      {/* ── Amenities ── */}
      <SectionCard title="Amenities">
        <p className="text-xs text-muted-foreground -mt-2 mb-1">Select all that apply or add a custom one.</p>
        <Controller
          control={control}
          name="amenities"
          render={({ field }) => (
            <AmenitiesTagPicker value={field.value} onChange={field.onChange} />
          )}
        />
      </SectionCard>

      {/* ── House Rules & KB ── */}
      <SectionCard title="House Rules & Knowledge Base">
        <div>
          <Label>House Rules</Label>
          <Textarea {...register('rules')} rows={4} placeholder="No parties, quiet hours after 10pm…" />
        </div>
        <div>
          <Label>Knowledge Base</Label>
          <Textarea {...register('knowledgeBase')} rows={4} placeholder="Building-specific notes for the team…" />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-mvr-primary hover:bg-mvr-primary/90"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Building'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
