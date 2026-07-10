'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import UnitForm, { type FieldOption, type UnitFormValues } from '@/components/modules/data-master/UnitForm'
import { normalizePhotoQuality } from '@/lib/validations/unit'

export interface UnitFormOptions {
  type: FieldOption[]
  view: FieldOption[]
  feature: FieldOption[]
  bathType: FieldOption[]
  status: FieldOption[]
}

interface Props {
  unitId: string
  buildings: { id: string; name: string }[]
  owners: { id: string; nickname: string }[]
  options: UnitFormOptions
  onClose: () => void
}

// Edit a unit in a centered modal: fetches the unit, maps it to UnitForm default
// values, and renders UnitForm inline (mirrors EditOwnerModal / the edit page).
export function EditUnitModal({ unitId, buildings, owners, options, onClose }: Props) {
  const router = useRouter()
  const [defaults, setDefaults] = useState<Partial<UnitFormValues> | null>(null)
  const [score, setScore] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/v1/units/${unitId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('load'))))
      .then((j: { data: Record<string, unknown> }) => {
        if (!active) return
        const u = j.data
        const str = (v: unknown) => (typeof v === 'string' ? v : '')
        const numStr = (v: unknown) => (v == null ? '' : String(v))

        const features = Array.isArray(u.features) ? [...(u.features as string[])] : []
        if (u.hasKitchen && !features.includes('kitchen')) features.unshift('kitchen')
        if (u.hasBalcony && !features.includes('balcony')) features.unshift('balcony')

        setDefaults({
          number: str(u.number),
          type: str(u.type),
          status: str(u.status) || 'onboarding',
          floor: numStr(u.floor),
          line: str(u.line),
          view: str(u.view),
          buildingId: str(u.buildingId),
          ownerUniqueId: str(u.ownerUniqueId),
          sqft: numStr(u.sqft),
          mt2: numStr(u.mt2),
          bedrooms: numStr(u.bedrooms),
          bathrooms: numStr(u.bathrooms),
          bathType: str(u.bathType),
          capacity: numStr(u.capacity),
          amenityCap: numStr(u.amenityCap),
          kings: numStr(u.kings ?? 0),
          queens: numStr(u.queens ?? 0),
          twins: numStr(u.twins ?? 0),
          totalBeds: u.totalBeds != null ? String(u.totalBeds) : '0',
          otherBeds: str(u.otherBeds),
          features,
          driveFolderUrl: str(u.driveFolderUrl),
          photoQuality: normalizePhotoQuality(u.photoQuality),
          notes: str(u.notes),
        })
        setScore(u.score != null ? String(u.score) : undefined)
      })
      .catch(() => { if (active) setError('Could not load this unit.') })
    return () => { active = false }
  }, [unitId])

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
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E0DBD4] bg-mvr-cream shadow-panel"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#E0DBD4] bg-white px-6 py-4">
          <h2 className="font-display text-lg font-bold text-mvr-primary">Edit Unit</h2>
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
            <UnitForm
              unitId={unitId}
              buildings={buildings}
              owners={owners}
              defaultValues={defaults}
              currentScore={score}
              typeOptions={options.type}
              viewOptions={options.view}
              featureOptions={options.feature}
              bathTypeOptions={options.bathType}
              statusOptions={options.status}
              onSaved={() => { onClose(); router.refresh() }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  )
}
