'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/file-uploader'

const formSchema = z.object({
  number:       z.string().min(1, 'Unit number is required').max(20),
  type:         z.string().optional(),
  status:       z.enum(['active', 'inactive', 'renovation', 'onboarding']),
  floor:        z.string().optional(),
  line:         z.string().max(10).optional(),
  view:         z.string().max(100).optional(),
  buildingId:   z.string().min(1, 'Building is required'),
  ownerUniqueId: z.string().optional(),
  sqft:         z.string().optional(),
  mt2:          z.string().optional(),
  bedrooms:     z.string().optional(),
  bathrooms:    z.string().optional(),
  capacity:     z.string().optional(),
  kings:        z.string().optional(),
  queens:       z.string().optional(),
  twins:        z.string().optional(),
  totalBeds:    z.string().optional(),
  otherBeds:    z.string().max(200).optional(),
  hasKitchen:   z.boolean().optional(),
  hasBalcony:   z.boolean().optional(),
  photoUrls:    z.array(z.string()),
  score:        z.string().optional(),
  notes:        z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface UnitFormProps {
  unitId?:       string
  buildings:     { id: string; name: string }[]
  owners:        { uniqueId: string; nickname: string }[]
  defaultValues?: Partial<FormValues>
}

// ── Micro-components (same pattern as BuildingForm) ───────────────────────

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
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary bg-white disabled:bg-gray-50 disabled:text-gray-400"
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

// ── Main form ─────────────────────────────────────────────────────────────

export default function UnitForm({ unitId, buildings, owners, defaultValues }: UnitFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const isEdit = !!unitId

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      number:       '',
      type:         '',
      status:       'onboarding',
      floor:        '',
      line:         '',
      view:         '',
      buildingId:   '',
      ownerUniqueId: '',
      sqft:         '',
      mt2:          '',
      bedrooms:     '',
      bathrooms:    '',
      capacity:     '',
      kings:        '0',
      queens:       '0',
      twins:        '0',
      totalBeds:    '',
      otherBeds:    '',
      hasKitchen:   false,
      hasBalcony:   false,
      photoUrls:    [] as string[],
      score:        '',
      notes:        '',
      ...defaultValues,
    },
  })

  function toInt(v: string | undefined): number | undefined {
    if (!v || v.trim() === '') return undefined
    const n = parseInt(v, 10)
    return isNaN(n) ? undefined : n
  }

  function toFloat(v: string | undefined): number | undefined {
    if (!v || v.trim() === '') return undefined
    const n = parseFloat(v)
    return isNaN(n) ? undefined : n
  }

  async function onSubmit(values: FormValues) {
    setServerError('')

    const payload: Record<string, unknown> = {
      number:       values.number,
      status:       values.status,
      type:         values.type        || undefined,
      floor:        toInt(values.floor),
      line:         values.line        || undefined,
      view:         values.view        || undefined,
      ownerUniqueId: values.ownerUniqueId || undefined,
      sqft:         toInt(values.sqft),
      mt2:          toFloat(values.mt2),
      bedrooms:     toInt(values.bedrooms),
      bathrooms:    toFloat(values.bathrooms),
      capacity:     toInt(values.capacity),
      kings:        toInt(values.kings)  ?? 0,
      queens:       toInt(values.queens) ?? 0,
      twins:        toInt(values.twins)  ?? 0,
      photoUrls:    values.photoUrls ?? [],
      totalBeds:    toInt(values.totalBeds),
      otherBeds:    values.otherBeds    || undefined,
      hasKitchen:   values.hasKitchen ?? false,
      hasBalcony:   values.hasBalcony ?? false,
      score:        toFloat(values.score),
      notes:        values.notes        || undefined,
    }

    if (!isEdit) {
      payload.buildingId = values.buildingId
    }

    const url    = isEdit ? `/api/v1/units/${unitId}` : '/api/v1/units'
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
    const targetId = isEdit ? unitId : data.data.id
    router.push(`/data-master/units/${targetId}`)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label required>Unit Number</Label>
            <Input {...register('number')} placeholder="e.g. 1204" />
            <FieldError message={errors.number?.message} />
          </div>
          <div>
            <Label>Type</Label>
            <Select {...register('type')}>
              <option value="">Select type…</option>
              <option value="studio">Studio</option>
              <option value="one_br">1 BR</option>
              <option value="two_br">2 BR</option>
              <option value="three_br">3 BR</option>
              <option value="four_br">4 BR</option>
              <option value="penthouse">Penthouse</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div>
            <Label required>Status</Label>
            <Select {...register('status')}>
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="renovation">Renovation</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Floor</Label>
            <Input {...register('floor')} type="number" min="0" placeholder="12" />
          </div>
          <div>
            <Label>Line</Label>
            <Input {...register('line')} placeholder="A" />
          </div>
          <div>
            <Label>View</Label>
            <Input {...register('view')} placeholder="Ocean view" />
          </div>
        </div>
      </SectionCard>

      {/* ── Relationships ── */}
      <SectionCard title="Relationships">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Building</Label>
            <Select {...register('buildingId')} disabled={isEdit}>
              <option value="">Select building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
            <FieldError message={errors.buildingId?.message} />
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">Building cannot be changed after creation.</p>
            )}
          </div>
          <div>
            <Label>Owner</Label>
            <Select {...register('ownerUniqueId')}>
              <option value="">No owner assigned</option>
              {owners.map((o) => (
                <option key={o.uniqueId} value={o.uniqueId}>{o.nickname}</option>
              ))}
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* ── Dimensions ── */}
      <SectionCard title="Dimensions">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label>Bedrooms</Label>
            <Input {...register('bedrooms')} type="number" min="0" placeholder="2" />
          </div>
          <div>
            <Label>Bathrooms</Label>
            <Input {...register('bathrooms')} type="number" min="0" step="0.5" placeholder="2.5" />
          </div>
          <div>
            <Label>Capacity (guests)</Label>
            <Input {...register('capacity')} type="number" min="1" placeholder="4" />
          </div>
          <div>
            <Label>Sqft</Label>
            <Input {...register('sqft')} type="number" min="0" placeholder="850" />
          </div>
          <div>
            <Label>m²</Label>
            <Input {...register('mt2')} type="number" min="0" step="0.01" placeholder="79.0" />
          </div>
        </div>
      </SectionCard>

      {/* ── Bed Config ── */}
      <SectionCard title="Bed Configuration">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <Label>Kings</Label>
            <Input {...register('kings')} type="number" min="0" placeholder="0" />
          </div>
          <div>
            <Label>Queens</Label>
            <Input {...register('queens')} type="number" min="0" placeholder="0" />
          </div>
          <div>
            <Label>Twins</Label>
            <Input {...register('twins')} type="number" min="0" placeholder="0" />
          </div>
          <div>
            <Label>Total Beds</Label>
            <Input {...register('totalBeds')} type="number" min="0" placeholder="2" />
          </div>
        </div>
        <div>
          <Label>Other Beds</Label>
          <Input {...register('otherBeds')} placeholder="e.g. 1 sofa bed, 1 trundle" />
        </div>
      </SectionCard>

      {/* ── Features ── */}
      <SectionCard title="Features">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('hasKitchen')}
              className="w-4 h-4 rounded border-gray-300 text-mvr-primary focus:ring-mvr-primary/30"
            />
            <span className="text-sm">Kitchen</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              {...register('hasBalcony')}
              className="w-4 h-4 rounded border-gray-300 text-mvr-primary focus:ring-mvr-primary/30"
            />
            <span className="text-sm">Balcony</span>
          </label>
        </div>
      </SectionCard>

      {/* ── Media & Notes ── */}
      <SectionCard title="Media & Notes">
        <Controller
          control={control}
          name="photoUrls"
          render={({ field }) => (
            <FileUploader
              value={field.value}
              onChange={field.onChange}
              folder="units"
              accept="image/*"
              label="Unit photos"
            />
          )}
        />
        <div>
          <Label>Score (0–10)</Label>
          <Input {...register('score')} type="number" min="0" max="10" step="0.1" placeholder="8.5" />
        </div>
        <div>
          <Label>Notes</Label>
          <Textarea {...register('notes')} rows={3} placeholder="Internal notes about this unit…" />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-mvr-primary hover:bg-mvr-primary/90"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Unit'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
