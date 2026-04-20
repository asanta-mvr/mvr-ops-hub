'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Trash2, Plus } from 'lucide-react'

const formSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  nickname: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'onboarding']),
  address: z.string().max(500).optional().or(z.literal('')),
  zone: z.string().max(100).optional().or(z.literal('')),
  zipcode: z.string().max(20).optional().or(z.literal('')),
  googleUrl: z.string().optional().or(z.literal('')),
  website: z.string().optional().or(z.literal('')),
  frontdeskPhone: z.string().max(30).optional().or(z.literal('')),
  frontdeskEmail: z.string().optional().or(z.literal('')),
  checkinHours: z.string().max(100).optional().or(z.literal('')),
  checkoutHours: z.string().max(100).optional().or(z.literal('')),
  amenitiesRaw: z.string().optional(),
  rules: z.string().optional(),
  knowledgeBase: z.string().optional(),
  emergencyContacts: z.array(
    z.object({
      name: z.string().min(1, 'Name required'),
      phone: z.string().min(1, 'Phone required'),
      role: z.string().min(1, 'Role required'),
    })
  ).default([]),
})

type FormValues = z.infer<typeof formSchema>

interface BuildingFormProps {
  buildingId?: string
  defaultValues?: Partial<FormValues>
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-medium text-muted-foreground mb-1">
      {children} {required && <span className="text-mvr-danger">*</span>}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary disabled:bg-gray-50 disabled:text-gray-400"
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary resize-y min-h-[80px]"
    />
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary bg-white"
    />
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  )
}

export default function BuildingForm({ buildingId, defaultValues }: BuildingFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const isEdit = !!buildingId

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: 'onboarding',
      emergencyContacts: [],
      ...defaultValues,
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'emergencyContacts' })

  async function onSubmit(values: FormValues) {
    setServerError('')

    const { amenitiesRaw, ...rest } = values
    const amenities = amenitiesRaw
      ? amenitiesRaw.split('\n').map((s) => s.trim()).filter(Boolean)
      : []

    const payload = {
      ...rest,
      amenities,
      nickname: rest.nickname || undefined,
      address: rest.address || undefined,
      zone: rest.zone || undefined,
      zipcode: rest.zipcode || undefined,
      googleUrl: rest.googleUrl || undefined,
      website: rest.website || undefined,
      frontdeskPhone: rest.frontdeskPhone || undefined,
      frontdeskEmail: rest.frontdeskEmail || undefined,
      checkinHours: rest.checkinHours || undefined,
      checkoutHours: rest.checkoutHours || undefined,
      rules: rest.rules || undefined,
      knowledgeBase: rest.knowledgeBase || undefined,
    }

    const url = isEdit ? `/api/v1/buildings/${buildingId}` : '/api/v1/buildings'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setServerError(data.error ?? 'Something went wrong')
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

      <SectionCard title="Basic Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label required>Building Name</Label>
            <Input {...register('name')} placeholder="e.g. Icon Brickell" />
            {errors.name && <p className="text-xs text-mvr-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Nickname</Label>
            <Input {...register('nickname')} placeholder="e.g. ICON" />
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
            <Label>Zone</Label>
            <Input {...register('zone')} placeholder="e.g. Brickell" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Location">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label>Address</Label>
            <Input {...register('address')} placeholder="485 Brickell Avenue" />
          </div>
          <div>
            <Label>Zip Code</Label>
            <Input {...register('zipcode')} placeholder="33131" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Google Maps URL</Label>
            <Input {...register('googleUrl')} placeholder="https://maps.google.com/..." type="url" />
          </div>
          <div>
            <Label>Website</Label>
            <Input {...register('website')} placeholder="https://..." type="url" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Front Desk">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Phone</Label>
            <Input {...register('frontdeskPhone')} placeholder="+1 (305) 000-0000" />
          </div>
          <div>
            <Label>Email</Label>
            <Input {...register('frontdeskEmail')} placeholder="frontdesk@building.com" type="email" />
            {errors.frontdeskEmail && (
              <p className="text-xs text-mvr-danger mt-1">{errors.frontdeskEmail.message}</p>
            )}
          </div>
          <div>
            <Label>Check-in Hours</Label>
            <Input {...register('checkinHours')} placeholder="3:00 PM – 10:00 PM" />
          </div>
          <div>
            <Label>Check-out Hours</Label>
            <Input {...register('checkoutHours')} placeholder="By 11:00 AM" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Emergency Contacts">
        <div className="space-y-3">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-start">
              <div className="grid grid-cols-3 gap-2 flex-1">
                <div>
                  <Input
                    {...register(`emergencyContacts.${index}.name`)}
                    placeholder="Name"
                  />
                  {errors.emergencyContacts?.[index]?.name && (
                    <p className="text-xs text-mvr-danger mt-0.5">
                      {errors.emergencyContacts[index]?.name?.message}
                    </p>
                  )}
                </div>
                <div>
                  <Input
                    {...register(`emergencyContacts.${index}.phone`)}
                    placeholder="Phone"
                  />
                </div>
                <div>
                  <Input
                    {...register(`emergencyContacts.${index}.role`)}
                    placeholder="Role (e.g. Security)"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                className="mt-2 text-mvr-danger hover:text-mvr-danger/80"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ name: '', phone: '', role: '' })}
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Contact
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Amenities">
        <div>
          <Label>Amenities (one per line)</Label>
          <Textarea
            {...register('amenitiesRaw')}
            placeholder={"Pool\nGym\nConcierge\nValet"}
            rows={5}
          />
        </div>
      </SectionCard>

      <SectionCard title="House Rules & Knowledge Base">
        <div>
          <Label>House Rules</Label>
          <Textarea {...register('rules')} rows={4} placeholder="No parties, quiet hours after 10pm..." />
        </div>
        <div>
          <Label>Knowledge Base</Label>
          <Textarea {...register('knowledgeBase')} rows={4} placeholder="Building-specific notes for the team..." />
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
