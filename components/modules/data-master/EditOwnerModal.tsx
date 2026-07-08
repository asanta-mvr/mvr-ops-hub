'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { OwnerForm, type OwnerFormProps } from '@/components/modules/data-master/OwnerForm'

type Defaults = NonNullable<OwnerFormProps['defaultValues']>

// Edit an owner in a centered modal: fetches the owner, maps it to the form's
// default values, and renders OwnerForm inline (mirrors the New Owner popup).
export function EditOwnerModal({ ownerId, onClose }: { ownerId: string; onClose: () => void }) {
  const router = useRouter()
  const [defaults, setDefaults] = useState<Defaults | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/v1/owners/${ownerId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((j: { data: Record<string, unknown> }) => {
        if (!active) return
        const o = j.data
        const nickname = typeof o.nickname === 'string' ? o.nickname : ''
        const parts = nickname.trim().split(/\s+/)
        const str = (v: unknown) => (typeof v === 'string' ? v : '')
        const num = (v: unknown) => (typeof v === 'number' ? v : 50)
        setDefaults({
          firstName: str(o.firstName) || parts[0] || '',
          lastName: str(o.lastName) || parts.slice(1).join(' '),
          status: (o.status === 'active' ? 'active' : 'inactive') as 'active' | 'inactive',
          category: str(o.category),
          personalityScore: num(o.personalityScore),
          communicationScore: num(o.communicationScore),
          documentType: str(o.documentType),
          documentNumber: str(o.documentNumber),
          phone: str(o.phone),
          address: str(o.address),
          city: str(o.city),
          state: str(o.state),
          postalCode: str(o.postalCode),
          country: str(o.country),
          email: str(o.email),
          otherEmail: str(o.otherEmail),
          photoUrl: str(o.photoUrl),
          linkedin: str(o.linkedin),
          dateOfBirth: o.dateOfBirth ? String(o.dateOfBirth).slice(0, 10) : '',
          nationality: str(o.nationality),
          language: str(o.language),
          siteUser: str(o.siteUser),
          notes: str(o.notes),
        })
      })
      .catch(() => { if (active) setError('Could not load this owner.') })
    return () => { active = false }
  }, [ownerId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E0DBD4] bg-mvr-cream shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E0DBD4] bg-white px-6 py-4">
          <h2 className="font-display text-lg font-bold text-mvr-primary">Edit Owner</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-mvr-neutral/60 hover:text-mvr-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error ? (
            <p className="text-sm text-mvr-danger">{error}</p>
          ) : !defaults ? (
            <p className="text-sm text-muted-foreground italic">Loading…</p>
          ) : (
            <OwnerForm
              ownerId={ownerId}
              defaultValues={defaults}
              onSuccess={() => { onClose(); router.refresh() }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
