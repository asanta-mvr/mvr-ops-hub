'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { z } from 'zod'
import { Button } from '@/components/ui/button'

// ── Form schema (strings for form controls, validated before submit) ──────────

const formSchema = z.object({
  uniqueId:       z.string().min(1, 'Unique ID is required').max(50),
  nickname:       z.string().min(1, 'Nickname is required').max(100),
  type:           z.enum(['individual', 'company']),
  status:         z.enum(['active', 'inactive', 'churned']),
  category:       z.string().max(50).optional(),
  personality:    z.string().max(200).optional(),
  documentType:   z.string().max(50).optional(),
  documentNumber: z.string().max(50).optional(),
  phone:          z.string().max(30).optional(),
  address:        z.string().optional(),
  email:          z.string().email('Invalid email').optional().or(z.literal('')),
  otherEmail:     z.string().email('Invalid email').optional().or(z.literal('')),
  photoUrl:       z.string().optional(),
  linkedin:       z.string().url('Must be a valid URL').optional().or(z.literal('')),
  age:            z.string().optional(),
  nationality:    z.string().max(50).optional(),
  language:       z.string().length(2, 'Must be a 2-letter ISO code'),
  siteUser:       z.string().max(100).optional(),
  notes:          z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export interface OwnerFormProps {
  ownerId?:       string
  defaultValues?: Partial<FormValues>
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

// ── Main component ────────────────────────────────────────────────────────────

export function OwnerForm({ ownerId, defaultValues }: OwnerFormProps) {
  const router = useRouter()
  const isEdit = Boolean(ownerId)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      uniqueId:       '',
      nickname:       '',
      type:           'individual',
      status:         'active',
      category:       '',
      personality:    '',
      documentType:   '',
      documentNumber: '',
      phone:          '',
      address:        '',
      email:          '',
      otherEmail:     '',
      photoUrl:       '',
      linkedin:       '',
      age:            '',
      nationality:    '',
      language:       'en',
      siteUser:       '',
      notes:          '',
      ...defaultValues,
    },
  })

  async function onSubmit(values: FormValues) {
    setServerError('')

    const payload: Record<string, unknown> = {
      nickname:       values.nickname,
      type:           values.type,
      status:         values.status,
      category:       values.category       || undefined,
      personality:    values.personality    || undefined,
      documentType:   values.documentType   || undefined,
      documentNumber: values.documentNumber || undefined,
      phone:          values.phone          || undefined,
      address:        values.address        || undefined,
      email:          values.email          || undefined,
      otherEmail:     values.otherEmail     || undefined,
      photoUrl:       values.photoUrl       || undefined,
      linkedin:       values.linkedin       || undefined,
      age:            values.age ? parseInt(values.age, 10) || undefined : undefined,
      nationality:    values.nationality    || undefined,
      language:       values.language       || 'en',
      siteUser:       values.siteUser       || undefined,
      notes:          values.notes          || undefined,
    }

    if (!isEdit) {
      payload.uniqueId = values.uniqueId
    }

    const url    = isEdit ? `/api/v1/owners/${ownerId}` : '/api/v1/owners'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
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
    const targetId = isEdit ? ownerId : (data as { data: { id: string } }).data.id
    router.push(`/data-master/owners/${targetId}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div className="bg-mvr-danger-light text-mvr-danger text-sm rounded-lg px-4 py-3">
          {serverError}
        </div>
      )}

      {/* ── Identity ── */}
      <SectionCard title="Identity">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Nickname / Display Name</Label>
            <Input {...register('nickname')} placeholder="e.g. Carlos R." />
            <FieldError message={errors.nickname?.message} />
          </div>
          <div>
            <Label required>Unique ID</Label>
            {isEdit ? (
              <div className="px-3 py-2 border rounded-lg bg-gray-50 text-sm text-muted-foreground font-mono">
                {defaultValues?.uniqueId}
                <input type="hidden" {...register('uniqueId')} />
              </div>
            ) : (
              <Input
                {...register('uniqueId')}
                placeholder="e.g. 4165f8ff"
                className="font-mono"
              />
            )}
            {!isEdit && (
              <p className="text-xs text-muted-foreground mt-1">
                Short ID used to link this owner to units. Cannot be changed after creation.
              </p>
            )}
            <FieldError message={errors.uniqueId?.message} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Owner Type</Label>
            <NativeSelect {...register('type')}>
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </NativeSelect>
            <FieldError message={errors.type?.message} />
          </div>
          <div>
            <Label required>Status</Label>
            <NativeSelect {...register('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="churned">Churned</option>
            </NativeSelect>
            <FieldError message={errors.status?.message} />
          </div>
        </div>

        <div>
          <Label>Category</Label>
          <Input
            {...register('category')}
            placeholder="e.g. Investor, Family, LLC"
          />
          <FieldError message={errors.category?.message} />
        </div>

        <div>
          <Label>Personality / Communication Style</Label>
          <Textarea
            {...register('personality')}
            rows={2}
            placeholder="Notes on communication preferences, style, etc."
          />
          <FieldError message={errors.personality?.message} />
        </div>
      </SectionCard>

      {/* ── Contact ── */}
      <SectionCard title="Contact">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input
              {...register('phone')}
              type="tel"
              placeholder="+1 305 555 0100"
            />
            <FieldError message={errors.phone?.message} />
          </div>
          <div>
            <Label>Primary Email</Label>
            <Input
              {...register('email')}
              type="email"
              placeholder="owner@example.com"
            />
            <FieldError message={errors.email?.message} />
          </div>
          <div>
            <Label>Secondary Email</Label>
            <Input
              {...register('otherEmail')}
              type="email"
              placeholder="other@example.com"
            />
            <FieldError message={errors.otherEmail?.message} />
          </div>
        </div>
        <div>
          <Label>Address</Label>
          <Textarea
            {...register('address')}
            rows={2}
            placeholder="Full mailing address"
          />
          <FieldError message={errors.address?.message} />
        </div>
      </SectionCard>

      {/* ── Profile ── */}
      <SectionCard title="Profile">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Age</Label>
            <Input
              {...register('age')}
              type="number"
              min="18"
              max="120"
              placeholder="45"
            />
            <FieldError message={errors.age?.message} />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input
              {...register('nationality')}
              placeholder="e.g. Colombian"
            />
            <FieldError message={errors.nationality?.message} />
          </div>
          <div>
            <Label>Language</Label>
            <Input
              {...register('language')}
              maxLength={2}
              placeholder="en"
              className="uppercase"
            />
            <p className="text-xs text-muted-foreground mt-1">2-letter ISO code (en, es, pt…)</p>
            <FieldError message={errors.language?.message} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>LinkedIn</Label>
            <Input
              {...register('linkedin')}
              type="url"
              placeholder="https://linkedin.com/in/…"
            />
            <FieldError message={errors.linkedin?.message} />
          </div>
          <div>
            <Label>Site / Portal User</Label>
            <Input
              {...register('siteUser')}
              placeholder="AppSheet username or portal login"
            />
            <FieldError message={errors.siteUser?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Documents ── */}
      <SectionCard title="Documents">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Document Type</Label>
            <Input
              {...register('documentType')}
              placeholder="e.g. Passport, Cedula, ID"
            />
            <FieldError message={errors.documentType?.message} />
          </div>
          <div>
            <Label>Document Number</Label>
            <Input
              {...register('documentNumber')}
              placeholder="Document number"
            />
            <FieldError message={errors.documentNumber?.message} />
          </div>
        </div>
      </SectionCard>

      {/* ── Photo ── */}
      <SectionCard title="Photo">
        <div>
          <Label>Photo URL</Label>
          <Input
            {...register('photoUrl')}
            type="url"
            placeholder="https://…"
          />
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
          <Textarea
            {...register('notes')}
            rows={4}
            placeholder="Any internal notes about this owner…"
          />
          <FieldError message={errors.notes?.message} />
        </div>
      </SectionCard>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-mvr-primary hover:bg-mvr-primary/90"
        >
          {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Owner'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
