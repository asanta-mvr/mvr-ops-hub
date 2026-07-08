'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { Country, State, City } from 'country-state-city'
import { Button } from '@/components/ui/button'
import { SearchableSelect, type SelectOption } from '@/components/ui/searchable-select'
import { OwnerTagSelect } from '@/components/modules/data-master/OwnerTagSelect'
import { LANGUAGES } from '@/lib/data/languages'

const DOC_TYPES = ['Passport', 'National ID', "Driver's License", 'Other']

// ── Form schema (form-control values; validated before submit) ─────────────────

const formSchema = z.object({
  firstName:          z.string().min(1, 'First name is required').max(60),
  lastName:           z.string().max(60).optional(),
  type:               z.string().max(50).optional(),
  status:             z.enum(['active', 'inactive']),
  category:           z.string().max(50).optional(),
  personalityScore:   z.number().min(0).max(100),
  communicationScore: z.number().min(0).max(100),
  documentType:       z.string().max(50).optional(),
  documentNumber:     z.string().max(50).optional(),
  phone:              z.string().max(40).optional(),
  address:            z.string().max(300).optional(),
  country:            z.string().max(100).optional(),
  state:              z.string().max(100).optional(),
  city:               z.string().max(100).optional(),
  postalCode:         z.string().max(20).optional(),
  email:              z.string().email('Invalid email').optional().or(z.literal('')),
  otherEmail:         z.string().email('Invalid email').optional().or(z.literal('')),
  photoUrl:           z.string().optional(),
  linkedin:           z.string().url('Must be a valid URL').optional().or(z.literal('')),
  dateOfBirth:        z.string().optional(),
  nationality:        z.string().max(100).optional(),
  language:           z.string().max(50).optional(),
  siteUser:           z.string().max(100).optional(),
  notes:              z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export interface OwnerFormProps {
  ownerId?:       string
  defaultValues?: Partial<FormValues>
  onSuccess?:     (id: string) => void
  onCancel?:      () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(dob: string | undefined): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age >= 0 && age < 150 ? age : null
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
  function Input(props, ref) {
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
  function Textarea(props, ref) {
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
  function NativeSelect(props, ref) {
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

function ScoreSlider({
  label, leftLabel, rightLabel, value, onChange,
}: {
  label: string
  leftLabel: string
  rightLabel: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <Label>{label}</Label>
        <span className="text-xs font-semibold text-mvr-primary tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-mvr-primary cursor-pointer"
      />
      <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function OwnerForm({ ownerId, defaultValues, onSuccess, onCancel }: OwnerFormProps) {
  const router = useRouter()
  const isEdit = Boolean(ownerId)
  const [serverError, setServerError] = useState('')

  const allCountries = useMemo(() => Country.getAllCountries(), [])

  // Resolve initial cascade selections (by stored name) for edit mode.
  const initCountry = useMemo(
    () => allCountries.find((c) => c.name === defaultValues?.country),
    [allCountries, defaultValues?.country]
  )
  const initStates = useMemo(
    () => (initCountry ? State.getStatesOfCountry(initCountry.isoCode) : []),
    [initCountry]
  )
  const initState = useMemo(
    () => initStates.find((s) => s.name === defaultValues?.state),
    [initStates, defaultValues?.state]
  )
  const initPhone = useMemo(() => {
    const p = defaultValues?.phone ?? ''
    const m = p.match(/^\+(\d+)\s*(.*)$/)
    if (m) {
      const c = allCountries.find((x) => x.phonecode.replace('+', '') === m[1])
      return { iso: c?.isoCode ?? 'US', number: m[2] }
    }
    return { iso: 'US', number: p }
  }, [allCountries, defaultValues?.phone])

  const [countryIso, setCountryIso] = useState(initCountry?.isoCode ?? '')
  const [stateIso, setStateIso] = useState(initState?.isoCode ?? '')
  const [phoneIso, setPhoneIso] = useState(initPhone.iso)
  const [phoneNumber, setPhoneNumber] = useState(initPhone.number)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      firstName: '', lastName: '', type: '', status: 'active', category: '',
      personalityScore: 50, communicationScore: 50, documentType: '', documentNumber: '',
      phone: '', address: '', country: '', state: '', city: '', postalCode: '',
      email: '', otherEmail: '', photoUrl: '', linkedin: '', dateOfBirth: '',
      nationality: '', language: '', siteUser: '', notes: '',
      ...defaultValues,
    },
  })

  // Keep the combined `phone` value in sync with the country dial code + number.
  useEffect(() => {
    const c = allCountries.find((x) => x.isoCode === phoneIso)
    const dial = c ? `+${c.phonecode.replace('+', '')}` : ''
    setValue('phone', phoneNumber.trim() ? `${dial} ${phoneNumber.trim()}`.trim() : '')
  }, [phoneIso, phoneNumber, allCountries, setValue])

  // ── Option lists ──
  const countryOptions: SelectOption[] = useMemo(
    () => allCountries.map((c) => ({ value: c.isoCode, label: c.name, keywords: c.name })),
    [allCountries]
  )
  const phoneOptions: SelectOption[] = useMemo(
    () =>
      allCountries.map((c) => ({
        value: c.isoCode,
        label: `${c.name} (+${c.phonecode.replace('+', '')})`,
        keywords: `${c.name} ${c.phonecode}`,
      })),
    [allCountries]
  )
  const nationalityOptions: SelectOption[] = useMemo(
    () => allCountries.map((c) => ({ value: c.name, label: c.name, keywords: c.name })),
    [allCountries]
  )
  const stateOptions: SelectOption[] = useMemo(
    () =>
      (countryIso ? State.getStatesOfCountry(countryIso) : []).map((s) => ({
        value: s.isoCode,
        label: s.name,
        keywords: s.name,
      })),
    [countryIso]
  )
  const cityOptions: SelectOption[] = useMemo(
    () =>
      (countryIso && stateIso ? City.getCitiesOfState(countryIso, stateIso) : []).map((c) => ({
        value: c.name,
        label: c.name,
        keywords: c.name,
      })),
    [countryIso, stateIso]
  )

  const personalityScore = watch('personalityScore')
  const communicationScore = watch('communicationScore')
  const dob = watch('dateOfBirth')
  const age = calcAge(dob)

  function onCountryChange(iso: string) {
    setCountryIso(iso)
    setStateIso('')
    setValue('country', allCountries.find((c) => c.isoCode === iso)?.name ?? '')
    setValue('state', '')
    setValue('city', '')
  }
  function onStateChange(iso: string) {
    setStateIso(iso)
    const st = State.getStatesOfCountry(countryIso).find((s) => s.isoCode === iso)
    setValue('state', st?.name ?? '')
    setValue('city', '')
  }

  async function onSubmit(values: FormValues) {
    setServerError('')
    const s = (v: string | undefined) => (v && v.length > 0 ? v : undefined)
    const payload: Record<string, unknown> = {
      firstName:          values.firstName,
      lastName:           s(values.lastName),
      type:               s(values.type),
      status:             values.status,
      category:           s(values.category),
      personalityScore:   values.personalityScore,
      communicationScore: values.communicationScore,
      documentType:       s(values.documentType),
      documentNumber:     s(values.documentNumber),
      phone:              s(values.phone),
      address:            s(values.address),
      city:               s(values.city),
      state:              s(values.state),
      postalCode:         s(values.postalCode),
      country:            s(values.country),
      email:              s(values.email),
      otherEmail:         s(values.otherEmail),
      photoUrl:           s(values.photoUrl),
      linkedin:           s(values.linkedin),
      dateOfBirth:        s(values.dateOfBirth),
      nationality:        s(values.nationality),
      language:           s(values.language),
      siteUser:           s(values.siteUser),
      notes:              s(values.notes),
    }

    const url    = isEdit ? `/api/v1/owners/${ownerId}` : '/api/v1/owners'
    const method = isEdit ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      const fieldErrors = (data as { details?: { fieldErrors?: Record<string, string[]> } }).details?.fieldErrors
      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        setServerError(
          `Validation failed — ${Object.entries(fieldErrors).map(([f, m]) => `${f}: ${m[0]}`).join(' · ')}`
        )
      } else {
        setServerError((data as { error?: string }).error ?? 'Something went wrong')
      }
      return
    }

    const data = await res.json()
    const targetId = (isEdit ? ownerId : (data as { data: { id: string } }).data.id) as string
    toast.success(isEdit ? 'Owner updated successfully' : 'Owner created successfully')
    if (onSuccess) {
      onSuccess(targetId)
    } else {
      router.push(`/data-master/owners/${targetId}`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="bg-mvr-danger-light text-mvr-danger text-sm rounded-lg px-4 py-3">{serverError}</div>
      )}

      {/* ── Identity ── */}
      <SectionCard title="Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>First Name</Label>
            <Input {...register('firstName')} placeholder="e.g. Carlos" />
            <FieldError message={errors.firstName?.message} />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input {...register('lastName')} placeholder="e.g. Rodríguez" />
            <FieldError message={errors.lastName?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Category</Label>
            <OwnerTagSelect field="category" value={watch('category') ?? ''} onChange={(v) => setValue('category', v)} placeholder="Select or add a category…" />
            <FieldError message={errors.category?.message} />
          </div>
          <div>
            <Label required>Status</Label>
            <NativeSelect {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </NativeSelect>
            <p className="text-xs text-muted-foreground mt-1">Setting to Inactive records the deactivation date.</p>
            <FieldError message={errors.status?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScoreSlider label="Personality" leftLabel="Easygoing / Calm" rightLabel="High-maintenance / Needy"
            value={personalityScore} onChange={(v) => setValue('personalityScore', v)} />
          <ScoreSlider label="Communication Style" leftLabel="Low-touch (statements only)" rightLabel="High-touch (frequent contact)"
            value={communicationScore} onChange={(v) => setValue('communicationScore', v)} />
        </div>
      </SectionCard>

      {/* ── Contact ── */}
      <SectionCard title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <div className="flex gap-2">
              <div className="w-[5.5rem] shrink-0">
                <SearchableSelect
                  options={phoneOptions}
                  value={phoneIso}
                  onChange={setPhoneIso}
                  searchPlaceholder="Country or code…"
                  triggerLabel={(sel) => {
                    const c = allCountries.find((x) => x.isoCode === sel?.value)
                    return c ? `(+${c.phonecode.replace('+', '')})` : '+…'
                  }}
                />
              </div>
              <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} type="tel" placeholder="300 123 4567" />
            </div>
            <FieldError message={errors.phone?.message} />
          </div>
          <div>
            <Label>Primary Email</Label>
            <Input {...register('email')} type="email" placeholder="owner@example.com" />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Secondary Email</Label>
            <Input {...register('otherEmail')} type="email" placeholder="other@example.com" />
            <FieldError message={errors.otherEmail?.message} />
          </div>
        </div>

        <div>
          <Label>Address</Label>
          <Input {...register('address')} placeholder="Street address" />
          <FieldError message={errors.address?.message} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Country</Label>
            <SearchableSelect options={countryOptions} value={countryIso} onChange={onCountryChange} placeholder="Select country…" searchPlaceholder="Search country…" />
          </div>
          <div>
            <Label>State / Province</Label>
            <SearchableSelect options={stateOptions} value={stateIso} onChange={onStateChange}
              placeholder={countryIso ? 'Select state…' : 'Pick a country first'} searchPlaceholder="Search state…" disabled={!countryIso} />
          </div>
          <div>
            <Label>City</Label>
            <SearchableSelect options={cityOptions} value={watch('city') ?? ''} onChange={(v) => setValue('city', v)}
              placeholder={stateIso ? 'Select city…' : 'Pick a state first'} searchPlaceholder="Search city…" disabled={!stateIso} />
          </div>
          <div>
            <Label>Postal Code</Label>
            <Input {...register('postalCode')} placeholder="e.g. 33131" />
            <FieldError message={errors.postalCode?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Profile ── */}
      <SectionCard title="Profile">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Date of Birth</Label>
            <Input {...register('dateOfBirth')} type="date" />
            {age != null && <p className="text-xs text-muted-foreground mt-1">Age: {age}</p>}
            <FieldError message={errors.dateOfBirth?.message} />
          </div>
          <div>
            <Label>Nationality</Label>
            <SearchableSelect options={nationalityOptions} value={watch('nationality') ?? ''} onChange={(v) => setValue('nationality', v)}
              placeholder="Select nationality…" searchPlaceholder="Search country…" />
          </div>
          <div>
            <Label>Language</Label>
            <OwnerTagSelect field="language" value={watch('language') ?? ''} onChange={(v) => setValue('language', v)}
              initialOptions={LANGUAGES} placeholder="Select or add a language…" />
            <FieldError message={errors.language?.message} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn</Label>
            <Input {...register('linkedin')} type="url" placeholder="https://linkedin.com/in/…" />
            <FieldError message={errors.linkedin?.message} />
          </div>
          <div>
            <Label>Site / Portal User</Label>
            <Input {...register('siteUser')} placeholder="AppSheet username or portal login" />
            <FieldError message={errors.siteUser?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Documents ── */}
      <SectionCard title="Documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Document Type</Label>
            <NativeSelect {...register('documentType')}>
              <option value="">Select type…</option>
              {DOC_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
            </NativeSelect>
            <FieldError message={errors.documentType?.message} />
          </div>
          <div>
            <Label>Document Number</Label>
            <Input {...register('documentNumber')} placeholder="Document number" />
            <FieldError message={errors.documentNumber?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Photo ── */}
      <SectionCard title="Photo">
        <div>
          <Label>Photo URL</Label>
          <Input {...register('photoUrl')} type="url" placeholder="https://…" />
          <p className="text-xs text-muted-foreground mt-1">
            Direct URL to the owner&apos;s profile photo (GCS signed URL or external).
          </p>
          <FieldError message={errors.photoUrl?.message} />
        </div>
      </SectionCard>

      {/* ── Notes ── */}
      <SectionCard title="Notes">
        <div>
          <Label>Internal Notes</Label>
          <Textarea {...register('notes')} rows={4} placeholder="Any internal notes about this owner…" />
          <FieldError message={errors.notes?.message} />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting} className="bg-mvr-primary hover:bg-mvr-primary/90">
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Owner'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel ?? (() => router.back())} disabled={isSubmitting}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
