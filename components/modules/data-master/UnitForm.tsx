'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FileUploader } from '@/components/ui/file-uploader'

// ── Types ─────────────────────────────────────────────────────────────────────

export type FieldOption = { id: string; value: string; label: string }

const PHOTO_QUALITY_OPTIONS = [
  { value: 'pro',         label: 'Pro' },
  { value: 'preliminary', label: 'Preliminary' },
  { value: 'low_quality', label: 'Low Quality' },
] as const

const formSchema = z.object({
  number:         z.string().min(1, 'Required').max(20),
  type:           z.string().min(1, 'Required'),
  status:         z.string().min(1, 'Required'),
  floor:          z.string().min(1, 'Required'),
  line:           z.string().optional(),
  view:           z.string().min(1, 'Required'),
  buildingId:     z.string().min(1, 'Required'),
  ownerUniqueId:  z.string().min(1, 'Required'),
  sqft:           z.string().min(1, 'Required'),
  mt2:            z.string().optional(),
  bedrooms:       z.string().min(1, 'Required'),
  bathrooms:      z.string().min(1, 'Required'),
  bathType:       z.string().optional(),
  capacity:       z.string().min(1, 'Required'),
  amenityCap:     z.string().optional(),
  kings:          z.string().optional(),
  queens:         z.string().optional(),
  twins:          z.string().optional(),
  totalBeds:      z.string().optional(),
  otherBeds:      z.string().max(200).optional(),
  features:       z.array(z.string()),
  photoUrls:      z.array(z.string()),
  driveFolderUrl: z.string().optional(),
  photoQuality:   z.enum(['pro', 'preliminary', 'low_quality']).optional(),
  notes:          z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface UnitFormProps {
  unitId?:          string
  buildings:        { id: string; name: string }[]
  owners:           { uniqueId: string; nickname: string }[]
  defaultValues?:   Partial<FormValues>
  currentScore?:    string
  typeOptions:      FieldOption[]
  viewOptions:      FieldOption[]
  featureOptions:   FieldOption[]
  bathTypeOptions:  FieldOption[]
  statusOptions:    FieldOption[]
}

// ── Micro-components ──────────────────────────────────────────────────────────

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

const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className: _cls, ...props }, ref) {
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

// ── EditableSelect ────────────────────────────────────────────────────────────
// Dropdown with "＋ Add new…" as the last option (ZoneSelect pattern).
// When chosen, the select is replaced by an inline input.

function EditableSelect({
  value,
  onChange,
  options,
  setOptions,
  field,
  placeholder = 'Select…',
  addPlaceholder = 'New option name…',
  hideManage = false,
}: {
  value: string
  onChange: (v: string) => void
  options: FieldOption[]
  setOptions: (opts: FieldOption[]) => void
  field: 'type' | 'view' | 'bath_type' | 'status'
  placeholder?: string
  addPlaceholder?: string
  hideManage?: boolean
}) {
  const [addingNew, setAddingNew]   = useState(false)
  const [showManage, setShowManage] = useState(false)
  const [newLabel, setNewLabel]     = useState('')
  const [saving, setSaving]         = useState(false)

  async function confirmAdd() {
    const trimmed = newLabel.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/unit-options', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field, label: trimmed }),
      })
      if (res.ok) {
        const { data } = await res.json() as { data: FieldOption }
        setOptions([...options, data])
        onChange(data.value)
        setNewLabel('')
        setAddingNew(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function removeOption(id: string, optValue: string) {
    await fetch(`/api/v1/unit-options/${id}`, { method: 'DELETE' })
    setOptions(options.filter(o => o.id !== id))
    if (value === optValue) onChange('')
  }

  if (addingNew) {
    return (
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            autoFocus
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void confirmAdd() } }}
            placeholder={addPlaceholder}
          />
          <button
            type="button"
            onClick={() => void confirmAdd()}
            disabled={saving || !newLabel.trim()}
            className="shrink-0 px-3 py-2 bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setAddingNew(false); setNewLabel('') }}
            className="shrink-0 px-3 py-2 border rounded-lg text-muted-foreground hover:bg-mvr-neutral transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <NativeSelect
        value={value}
        onChange={e => {
          if (e.target.value === '__add_new__') {
            setAddingNew(true)
          } else {
            onChange(e.target.value)
          }
        }}
      >
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.id} value={o.value}>{o.label}</option>
        ))}
        <option value="__add_new__">＋ Add new…</option>
      </NativeSelect>

      {!hideManage && options.length > 0 && (
        <button
          type="button"
          onClick={() => setShowManage(v => !v)}
          className="text-xs text-muted-foreground hover:text-mvr-primary transition-colors"
        >
          {showManage ? 'Hide options' : `Manage options (${options.length})`}
        </button>
      )}

      {!hideManage && showManage && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {options.map(o => (
            <span
              key={o.id}
              className="inline-flex items-center gap-1 text-xs bg-mvr-neutral rounded-full px-2.5 py-1"
            >
              {o.label}
              <button
                type="button"
                onClick={() => void removeOption(o.id, o.value)}
                className="text-muted-foreground hover:text-mvr-danger leading-none"
                title="Remove option"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── FeaturesSection ───────────────────────────────────────────────────────────

function FeaturesSection({
  features,
  setFeatures,
  featureOptions,
  setFeatureOptions,
}: {
  features: string[]
  setFeatures: (v: string[]) => void
  featureOptions: FieldOption[]
  setFeatureOptions: (opts: FieldOption[]) => void
}) {
  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)

  function toggleFeature(val: string) {
    setFeatures(features.includes(val) ? features.filter(f => f !== val) : [...features, val])
  }

  async function addFeature() {
    if (!newLabel.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/v1/unit-options', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ field: 'feature', label: newLabel.trim() }),
      })
      if (res.ok) {
        const { data } = await res.json() as { data: FieldOption }
        setFeatureOptions([...featureOptions, data])
        setFeatures([...features, data.value])
        setNewLabel('')
        setShowAdd(false)
      }
    } finally {
      setSaving(false)
    }
  }

  async function removeFeatureOption(id: string, optValue: string) {
    await fetch(`/api/v1/unit-options/${id}`, { method: 'DELETE' })
    setFeatureOptions(featureOptions.filter(o => o.id !== id))
    setFeatures(features.filter(f => f !== optValue))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-4">
        {featureOptions.map(opt => (
          <div key={opt.id} className="flex items-center gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={features.includes(opt.value)}
                onChange={() => toggleFeature(opt.value)}
                className="w-4 h-4 rounded border-gray-300 text-mvr-primary focus:ring-mvr-primary/30"
              />
              <span className="text-sm">{opt.label}</span>
            </label>
            <button
              type="button"
              onClick={() => void removeFeatureOption(opt.id, opt.value)}
              className="text-muted-foreground hover:text-mvr-danger text-xs leading-none opacity-40 hover:opacity-100 transition-opacity"
              title="Remove feature option"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {showAdd ? (
        <div className="flex gap-2 items-center">
          <Input
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            placeholder="Feature name…"
            className="max-w-[220px]"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addFeature() } }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => void addFeature()}
            disabled={saving || !newLabel.trim()}
            className="shrink-0 px-3 py-2 bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 disabled:opacity-50 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setShowAdd(false); setNewLabel('') }}
            className="shrink-0 px-3 py-2 border rounded-lg text-muted-foreground hover:bg-mvr-neutral transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="text-xs text-muted-foreground hover:text-mvr-primary transition-colors flex items-center gap-1"
        >
          <span className="text-base leading-none">+</span> Add feature
        </button>
      )}
    </div>
  )
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function UnitForm({
  unitId,
  buildings,
  owners,
  defaultValues,
  currentScore,
  typeOptions: initialTypeOptions,
  viewOptions: initialViewOptions,
  featureOptions: initialFeatureOptions,
  bathTypeOptions: initialBathTypeOptions,
  statusOptions: initialStatusOptions,
}: UnitFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const isEdit = !!unitId

  const [typeOptions,     setTypeOptions]     = useState<FieldOption[]>(initialTypeOptions)
  const [viewOptions,     setViewOptions]     = useState<FieldOption[]>(initialViewOptions)
  const [featureOptions,  setFeatureOptions]  = useState<FieldOption[]>(initialFeatureOptions)
  const [bathTypeOptions, setBathTypeOptions] = useState<FieldOption[]>(initialBathTypeOptions)
  const [statusOptions,   setStatusOptions]   = useState<FieldOption[]>(initialStatusOptions)

  const {
    register,
    handleSubmit,
    control,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      number:         '',
      type:           '',
      status:         'onboarding',
      floor:          '',
      line:           '',
      view:           '',
      buildingId:     '',
      ownerUniqueId:  '',
      sqft:           '',
      mt2:            '',
      bedrooms:       '',
      bathrooms:      '',
      bathType:       '',
      capacity:       '',
      amenityCap:     '',
      kings:          '0',
      queens:         '0',
      twins:          '0',
      totalBeds:      '0',
      otherBeds:      '',
      features:       [],
      photoUrls:      [] as string[],
      driveFolderUrl: '',
      photoQuality:   undefined,
      notes:          '',
      ...defaultValues,
    },
  })

  const typeValue      = watch('type')           ?? ''
  const viewValue      = watch('view')           ?? ''
  const bathTypeValue  = watch('bathType')       ?? ''
  const statusValue    = watch('status')         ?? ''
  const driveFolderUrl = watch('driveFolderUrl') ?? ''
  const hasdriveFolder = driveFolderUrl.trim().length > 0

  // Auto-compute total beds from kings + queens + twins
  const kingsStr  = watch('kings')  ?? '0'
  const queensStr = watch('queens') ?? '0'
  const twinsStr  = watch('twins')  ?? '0'

  useEffect(() => {
    const k = parseInt(kingsStr)  || 0
    const q = parseInt(queensStr) || 0
    const t = parseInt(twinsStr)  || 0
    setValue('totalBeds', String(k + q + t))
  }, [kingsStr, queensStr, twinsStr]) // eslint-disable-line react-hooks/exhaustive-deps

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

    const features = values.features ?? []

    const payload: Record<string, unknown> = {
      number:         values.number,
      status:         values.status,
      type:           values.type           || undefined,
      floor:          toInt(values.floor),
      line:           values.line           || undefined,
      view:           values.view           || undefined,
      ownerUniqueId:  values.ownerUniqueId  || undefined,
      sqft:           toInt(values.sqft),
      mt2:            toFloat(values.mt2),
      bedrooms:       toInt(values.bedrooms),
      bathrooms:      toFloat(values.bathrooms),
      bathType:       values.bathType       || undefined,
      capacity:       toInt(values.capacity),
      amenityCap:     toInt(values.amenityCap),
      kings:          toInt(values.kings)   ?? 0,
      queens:         toInt(values.queens)  ?? 0,
      twins:          toInt(values.twins)   ?? 0,
      totalBeds:      toInt(values.totalBeds),
      otherBeds:      values.otherBeds      || undefined,
      hasKitchen:     features.includes('kitchen'),
      hasBalcony:     features.includes('balcony'),
      features:       features.filter(f => f !== 'kitchen' && f !== 'balcony'),
      photoUrls:      values.photoUrls ?? [],
      driveFolderUrl: values.driveFolderUrl || undefined,
      photoQuality:   values.photoQuality   || undefined,
      notes:          values.notes          || undefined,
      // score is intentionally excluded — it is calculated, not user-editable
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
        for (const [f, msgs] of Object.entries(fieldErrors)) {
          setError(f as keyof FormValues, { message: msgs[0] })
        }
        setServerError(
          `Validation failed — ${Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m[0]}`).join(' · ')}`
        )
      } else {
        setServerError((data as { error?: string }).error ?? 'Something went wrong')
      }
      return
    }

    const data = await res.json()
    const targetId = isEdit ? unitId : (data.data as { id: string }).id
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
            <Label required>Type</Label>
            <EditableSelect
              value={typeValue}
              onChange={v => setValue('type', v)}
              options={typeOptions}
              setOptions={setTypeOptions}
              field="type"
              placeholder="Select type…"
            />
            <FieldError message={errors.type?.message} />
          </div>
          <div>
            <Label required>Status</Label>
            <EditableSelect
              value={statusValue}
              onChange={v => setValue('status', v)}
              options={statusOptions}
              setOptions={setStatusOptions}
              field="status"
              placeholder="Select status…"
            />
            <FieldError message={errors.status?.message} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label required>Floor</Label>
            <Input {...register('floor')} type="number" min="0" placeholder="12" />
            <FieldError message={errors.floor?.message} />
          </div>
          <div>
            <Label>Line</Label>
            <Input {...register('line')} type="number" min="0" placeholder="1" />
          </div>
          <div>
            <Label required>View</Label>
            <EditableSelect
              value={viewValue}
              onChange={v => setValue('view', v)}
              options={viewOptions}
              setOptions={setViewOptions}
              field="view"
              placeholder="Select view…"
            />
            <FieldError message={errors.view?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Relationships ── */}
      <SectionCard title="Relationships">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Building</Label>
            <NativeSelect {...register('buildingId')} disabled={isEdit}>
              <option value="">Select building…</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </NativeSelect>
            <FieldError message={errors.buildingId?.message} />
            {isEdit && (
              <p className="text-xs text-muted-foreground mt-1">Building cannot be changed after creation.</p>
            )}
          </div>
          <div>
            <Label required>Owner</Label>
            <NativeSelect {...register('ownerUniqueId')}>
              <option value="">Select owner…</option>
              {owners.map((o) => (
                <option key={o.uniqueId} value={o.uniqueId}>{o.nickname}</option>
              ))}
            </NativeSelect>
            <FieldError message={errors.ownerUniqueId?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Dimensions ── */}
      <SectionCard title="Dimensions">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <Label required>Bedrooms</Label>
            <Input {...register('bedrooms')} type="number" min="0" placeholder="2" />
            <FieldError message={errors.bedrooms?.message} />
          </div>
          <div>
            <Label required>Bathrooms</Label>
            <Input {...register('bathrooms')} type="number" min="0" step="0.5" placeholder="2.5" />
            <FieldError message={errors.bathrooms?.message} />
          </div>
          <div>
            <Label>Bath Type</Label>
            <EditableSelect
              value={bathTypeValue}
              onChange={v => setValue('bathType', v)}
              options={bathTypeOptions}
              setOptions={setBathTypeOptions}
              field="bath_type"
              placeholder="Select bath type…"
            />
          </div>
          <div>
            <Label required>Capacity (guests)</Label>
            <Input {...register('capacity')} type="number" min="1" placeholder="4" />
            <FieldError message={errors.capacity?.message} />
          </div>
          <div>
            <Label>Amenity Capacity</Label>
            <Input {...register('amenityCap')} type="number" min="0" placeholder="0" />
          </div>
          <div>
            <Label required>Sqft</Label>
            <Input
              {...register('sqft', {
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = parseFloat(e.target.value)
                  if (!isNaN(v) && v > 0) {
                    setValue('mt2', String(Math.round(v * 0.0929 * 100) / 100))
                  } else if (!e.target.value) {
                    setValue('mt2', '')
                  }
                },
              })}
              type="number"
              min="0"
              placeholder="850"
            />
            <FieldError message={errors.sqft?.message} />
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
            <Input
              {...register('totalBeds')}
              type="number"
              disabled
              className="bg-gray-50 text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground mt-1">Auto-calculated</p>
          </div>
        </div>
        <div>
          <Label>Other Beds</Label>
          <Input {...register('otherBeds')} placeholder="e.g. 1 sofa bed, 1 trundle" />
        </div>
      </SectionCard>

      {/* ── Features ── */}
      <SectionCard title="Features">
        <Controller
          control={control}
          name="features"
          render={({ field }) => (
            <FeaturesSection
              features={field.value}
              setFeatures={field.onChange}
              featureOptions={featureOptions}
              setFeatureOptions={setFeatureOptions}
            />
          )}
        />
      </SectionCard>

      {/* ── Media & Notes ── */}
      <SectionCard title="Media & Notes">
        {/* 1. Google Drive Folder — must be set before photos can be uploaded */}
        <div>
          <Label>Google Drive Folder</Label>
          <Input
            {...register('driveFolderUrl')}
            type="url"
            placeholder="https://drive.google.com/drive/folders/…"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Link the unit&apos;s Google Drive folder. Required to enable photo uploads.
          </p>
        </div>

        {/* 2. Photo Quality tag */}
        <div>
          <Label>Photo Quality</Label>
          <NativeSelect {...register('photoQuality')}>
            <option value="">— Not rated —</option>
            {PHOTO_QUALITY_OPTIONS.map(q => (
              <option key={q.value} value={q.value}>{q.label}</option>
            ))}
          </NativeSelect>
        </div>

        {/* 3. Unit photos — gated behind Drive folder */}
        <div>
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
                disabled={!hasdriveFolder}
              />
            )}
          />
          {!hasdriveFolder && (
            <p className="text-xs text-amber-600 mt-1">
              Set a Google Drive folder above to enable photo uploads.
            </p>
          )}
        </div>

        {/* 4. Score — read-only, calculated field */}
        <div>
          <Label>Score (calculated)</Label>
          <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-gray-50 text-sm text-muted-foreground">
            {currentScore ? (
              <span className="font-medium text-foreground">{currentScore} / 10</span>
            ) : (
              <span className="italic">Not yet calculated</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Automatically calculated — not editable.</p>
        </div>

        {/* 5. Notes */}
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
