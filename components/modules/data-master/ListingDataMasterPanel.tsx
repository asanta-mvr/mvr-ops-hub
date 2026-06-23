'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save } from 'lucide-react'

export interface ListingPanelData {
  id: string
  name: string
  nickname: string | null
  urlAirbnb: string | null
  urlBooking: string | null
  urlVrbo: string | null
  urlExpedia: string | null
  urlVacasa: string | null
}

const URL_FIELDS: Array<{ key: keyof ListingPanelData; label: string }> = [
  { key: 'urlAirbnb', label: 'Airbnb URL' },
  { key: 'urlBooking', label: 'Booking.com URL' },
  { key: 'urlVrbo', label: 'Vrbo URL' },
  { key: 'urlExpedia', label: 'Expedia URL' },
  { key: 'urlVacasa', label: 'Vacasa URL' },
]

export default function ListingDataMasterPanel({
  listing,
  editable,
}: {
  listing: ListingPanelData
  editable: boolean
}) {
  const router = useRouter()
  const [form, setForm] = useState<ListingPanelData>(listing)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof ListingPanelData, value: string) =>
    setForm((f) => ({ ...f, [key]: value === '' ? null : value }))

  async function save() {
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/listings/${listing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          nickname: form.nickname,
          urlAirbnb: form.urlAirbnb ?? '',
          urlBooking: form.urlBooking ?? '',
          urlVrbo: form.urlVrbo ?? '',
          urlExpedia: form.urlExpedia ?? '',
          urlVacasa: form.urlVacasa ?? '',
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const fieldErr = json?.details?.fieldErrors
          ? Object.values(json.details.fieldErrors).flat()[0]
          : null
        toast.error((fieldErr as string) ?? json?.error ?? 'Could not save')
        return
      }
      toast.success('Listing saved')
      router.refresh()
    } catch {
      toast.error('Network error while saving')
    } finally {
      setSaving(false)
    }
  }

  const inputCls =
    'w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20 disabled:bg-mvr-neutral/30'

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
        <h3 className="font-display text-lg text-mvr-primary">Listing record</h3>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-mvr-olive">Name</label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              disabled={!editable}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-mvr-olive">Nickname</label>
            <input
              value={form.nickname ?? ''}
              onChange={(e) => set('nickname', e.target.value)}
              disabled={!editable}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
        <h3 className="font-display text-lg text-mvr-primary">Channel URLs</h3>
        <div className="mt-4 space-y-3">
          {URL_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-1 block text-xs font-medium text-mvr-olive">{label}</label>
              <input
                value={(form[key] as string | null) ?? ''}
                onChange={(e) => set(key, e.target.value)}
                disabled={!editable}
                placeholder="https://…"
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      {editable && (
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-mvr-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-mvr-primary/90 focus-visible:ring-2 focus-visible:ring-mvr-primary/30 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className={`size-4 ${saving ? 'animate-pulse' : ''}`} />
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      )}
    </div>
  )
}
