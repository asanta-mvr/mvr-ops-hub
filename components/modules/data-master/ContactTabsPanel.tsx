'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus, Pencil, Trash2, X, Check, Phone, Mail, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createPropertyManagerSchema,
  type CreatePropertyManagerInput,
} from '@/lib/validations/property-manager'

interface PropertyManager {
  id: string
  name: string
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  contactRole: string | null
  contactArea: string | null
  contactMatters: string | null
  isPrimary: boolean
}

interface ContactTabsPanelProps {
  buildingId: string
  initialManagers: PropertyManager[]
  frontdeskPhone: string | null
  frontdeskEmail: string | null
  checkinHours: string | null
  checkoutHours: string | null
}

type Tab = 'managers' | 'frontdesk'

export default function ContactTabsPanel({
  buildingId,
  initialManagers,
  frontdeskPhone,
  frontdeskEmail,
  checkinHours,
  checkoutHours,
}: ContactTabsPanelProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('managers')
  const [managers, setManagers] = useState<PropertyManager[]>(initialManagers)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePropertyManagerInput>({
    resolver: standardSchemaResolver(createPropertyManagerSchema),
    defaultValues: { isPrimary: false },
  })

  function openAdd() {
    setEditingId(null)
    reset({ name: '', contactName: '', contactPhone: '', contactEmail: '', contactRole: '', contactArea: '', contactMatters: '', isPrimary: false })
    setServerError(null)
    setFormOpen(true)
  }

  function openEdit(pm: PropertyManager) {
    setEditingId(pm.id)
    reset({
      name: pm.name,
      contactName: pm.contactName ?? '',
      contactPhone: pm.contactPhone ?? '',
      contactEmail: pm.contactEmail ?? '',
      contactRole: pm.contactRole ?? '',
      contactArea: pm.contactArea ?? '',
      contactMatters: pm.contactMatters ?? '',
      isPrimary: pm.isPrimary,
    })
    setServerError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setServerError(null)
    reset()
  }

  async function onSubmit(data: CreatePropertyManagerInput) {
    setServerError(null)
    const isEdit = editingId !== null
    const url = isEdit
      ? `/api/v1/buildings/${buildingId}/property-managers/${editingId}`
      : `/api/v1/buildings/${buildingId}/property-managers`

    const res = await fetch(url, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      setServerError(json.error ?? 'Something went wrong')
      return
    }

    const { data: saved } = await res.json()

    if (data.isPrimary) {
      setManagers((prev) =>
        prev
          .map((m) => ({ ...m, isPrimary: false }))
          .map((m) => (m.id === saved.id ? saved : m))
      )
    } else if (isEdit) {
      setManagers((prev) => prev.map((m) => (m.id === saved.id ? saved : m)))
    } else {
      setManagers((prev) => [...prev, saved])
    }

    closeForm()
    router.refresh()
  }

  async function handleDelete(pmId: string) {
    setDeletingId(pmId)
    const res = await fetch(
      `/api/v1/buildings/${buildingId}/property-managers/${pmId}`,
      { method: 'DELETE' }
    )
    setDeletingId(null)
    if (!res.ok) return
    setManagers((prev) => prev.filter((m) => m.id !== pmId))
    router.refresh()
  }

  const hasFrontdesk = !!(frontdeskPhone || frontdeskEmail || checkinHours || checkoutHours)

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {/* Tab header */}
      <div className="flex border-b border-[#E0DBD4]">
        {(['managers', 'frontdesk'] as Tab[]).map((tab) => {
          const label = tab === 'managers' ? 'Property Managers' : 'Front Desk'
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); if (tab !== 'managers') closeForm() }}
              className={`flex-1 px-4 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? 'text-mvr-primary border-b-2 border-mvr-primary -mb-px bg-white'
                  : 'text-muted-foreground hover:text-mvr-primary hover:bg-mvr-cream'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-5">
        {activeTab === 'managers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              {!formOpen && (
                <Button variant="ghost" size="sm" onClick={openAdd} className="h-7 px-2 text-xs ml-auto">
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add
                </Button>
              )}
            </div>

            {managers.length === 0 && !formOpen && (
              <p className="text-sm text-muted-foreground">None on file.</p>
            )}

            <div className="space-y-3">
              {managers.map((pm) => (
                <div key={pm.id} className="flex items-start justify-between gap-2 group">
                  <div className="text-sm min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{pm.name}</p>
                      {pm.isPrimary && (
                        <span className="shrink-0 text-xs bg-mvr-primary/10 text-mvr-primary px-1.5 py-0.5 rounded">
                          Primary
                        </span>
                      )}
                    </div>
                    {pm.contactRole && (
                      <p className="text-muted-foreground text-xs">{pm.contactRole}</p>
                    )}
                    {pm.contactName && (
                      <p className="text-muted-foreground text-xs">{pm.contactName}</p>
                    )}
                    {pm.contactPhone && (
                      <a href={`tel:${pm.contactPhone}`} className="flex items-center gap-1 text-xs text-mvr-primary hover:underline">
                        <Phone className="w-3 h-3" />
                        {pm.contactPhone}
                      </a>
                    )}
                    {pm.contactEmail && (
                      <a href={`mailto:${pm.contactEmail}`} className="flex items-center gap-1 text-xs text-mvr-primary hover:underline truncate">
                        <Mail className="w-3 h-3" />
                        {pm.contactEmail}
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(pm)}
                      className="p-1 rounded hover:bg-mvr-neutral text-muted-foreground hover:text-mvr-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(pm.id)}
                      disabled={deletingId === pm.id}
                      className="p-1 rounded hover:bg-mvr-danger-light text-muted-foreground hover:text-mvr-danger transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {formOpen && (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 border-t pt-4">
                <p className="text-xs font-medium text-mvr-primary uppercase tracking-wide">
                  {editingId ? 'Edit Employee' : 'New Employee'}
                </p>

                {serverError && (
                  <p className="text-xs text-mvr-danger bg-mvr-danger-light rounded px-3 py-2">{serverError}</p>
                )}

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <input
                      {...register('name')}
                      placeholder="Company name *"
                      className="w-full text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                    />
                    {errors.name && <p className="text-xs text-mvr-danger mt-0.5">{errors.name.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      {...register('contactName')}
                      placeholder="Contact name"
                      className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                    />
                    <input
                      {...register('contactRole')}
                      placeholder="Role (e.g. Manager)"
                      className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      {...register('contactPhone')}
                      placeholder="Phone"
                      className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                    />
                    <input
                      {...register('contactEmail')}
                      placeholder="Email"
                      type="email"
                      className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                    />
                    {errors.contactEmail && (
                      <p className="col-span-2 text-xs text-mvr-danger -mt-1">{errors.contactEmail.message}</p>
                    )}
                  </div>

                  <input
                    {...register('contactArea')}
                    placeholder="Area of responsibility"
                    className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary"
                  />

                  <textarea
                    {...register('contactMatters')}
                    placeholder="Notes / what they handle"
                    rows={2}
                    className="text-sm border rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-mvr-primary resize-none"
                  />

                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      {...register('isPrimary')}
                      type="checkbox"
                      className="rounded border-gray-300 text-mvr-primary focus:ring-mvr-primary"
                    />
                    <span>Set as primary property manager</span>
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={isSubmitting} className="h-7 px-3 text-xs">
                    <Check className="w-3.5 h-3.5 mr-1" />
                    {isSubmitting ? 'Saving…' : 'Save'}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={closeForm} className="h-7 px-3 text-xs">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {activeTab === 'frontdesk' && (
          <div className="space-y-2 text-sm">
            {frontdeskPhone && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4 shrink-0" />
                <a href={`tel:${frontdeskPhone}`} className="hover:text-mvr-primary">
                  {frontdeskPhone}
                </a>
              </div>
            )}
            {frontdeskEmail && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4 shrink-0" />
                <a href={`mailto:${frontdeskEmail}`} className="hover:text-mvr-primary">
                  {frontdeskEmail}
                </a>
              </div>
            )}
            {checkinHours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Check-in: {checkinHours}</span>
              </div>
            )}
            {checkoutHours && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Check-out: {checkoutHours}</span>
              </div>
            )}
            {!hasFrontdesk && (
              <p className="text-muted-foreground">No contact info yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
