'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Link2, X, ArrowLeftRight, Plus, Building2, Check } from 'lucide-react'
import UnitForm, { type FieldOption, type UnitFormValues } from './UnitForm'

// Guesty-derived structural values (comparison "Guesty side"). Plain shape so we
// don't import the server-only guesty lib into this client component.
export interface GuestyUnitBaseline {
  bedrooms: number | null
  bathrooms: number | null
  capacity: number | null
  totalBeds: number | null
  sqft: number | null
  kings: number
  queens: number
  twins: number
  propertyType: string | null
}

// The attached unit's structural values (the source of truth side).
export interface AttachedUnitSummary {
  id: string
  updatedAt: string
  number: string
  buildingName: string | null
  bedrooms: number | null
  bathrooms: number | null
  capacity: number | null
  totalBeds: number | null
  sqft: number | null
  kings: number
  queens: number
  twins: number
  type: string | null
}

interface FormPrereqs {
  buildings: { id: string; name: string }[]
  owners: { id: string; nickname: string }[]
  typeOptions: FieldOption[]
  viewOptions: FieldOption[]
  featureOptions: FieldOption[]
  bathTypeOptions: FieldOption[]
  statusOptions: FieldOption[]
}

interface Props {
  listingId: string
  editable: boolean
  unit: AttachedUnitSummary | null
  unitFormDefaults: Partial<UnitFormValues> | null
  createDefaults: Partial<UnitFormValues>
  guesty: GuestyUnitBaseline
  prereqs: FormPrereqs
}

// Numeric fields that can be copied from Guesty into the unit (one click each).
type CopyField = 'bedrooms' | 'bathrooms' | 'capacity' | 'totalBeds' | 'sqft' | 'kings' | 'queens' | 'twins'

export default function ListingUnitCockpit({
  listingId,
  editable,
  unit,
  unitFormDefaults,
  createDefaults,
  guesty,
  prereqs,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)

  async function patchListing(unitId: string | null) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/listings/${listingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not update the unit link')
        return
      }
      toast.success(unitId ? 'Listing attached to unit' : 'Listing detached')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function copyField(field: CopyField, value: number) {
    if (!unit) return
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/units/${unit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not update the unit')
        return
      }
      toast.success('Unit updated from Guesty')
      router.refresh()
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  // ── Not attached ──────────────────────────────────────────────────────────
  if (!unit) {
    return (
      <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
        <h3 className="font-display text-lg text-mvr-primary">Unit</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Attach this listing to a unit to complete its data. The unit is the source of truth — nothing
          is copied from Guesty automatically.
        </p>

        {editable && !creating && (
          <div className="mt-4 space-y-4">
            <UnitPicker disabled={busy} onPick={(id) => patchListing(id)} />
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-[#E0DBD4]" />
              or
              <span className="h-px flex-1 bg-[#E0DBD4]" />
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#E0DBD4] px-4 py-2.5 text-sm font-medium text-mvr-olive transition-colors hover:bg-mvr-neutral/50"
            >
              <Plus className="size-4" />
              Create new unit from this listing
            </button>
          </div>
        )}

        {editable && creating && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Pre-filled with Guesty suggestions — review before saving.
              </p>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-mvr-olive"
              >
                Cancel
              </button>
            </div>
            <UnitForm
              buildings={prereqs.buildings}
              owners={prereqs.owners}
              defaultValues={createDefaults}
              typeOptions={prereqs.typeOptions}
              viewOptions={prereqs.viewOptions}
              featureOptions={prereqs.featureOptions}
              bathTypeOptions={prereqs.bathTypeOptions}
              statusOptions={prereqs.statusOptions}
              onSaved={(newUnitId) => patchListing(newUnitId)}
            />
          </div>
        )}

        {!editable && <p className="mt-4 text-sm text-muted-foreground/70">You don&rsquo;t have edit access.</p>}
      </div>
    )
  }

  // ── Attached ──────────────────────────────────────────────────────────────
  const rows: Array<{ label: string; field: CopyField | null; unitVal: number | string | null; guestyVal: number | string | null }> = [
    { label: 'Bedrooms', field: 'bedrooms', unitVal: unit.bedrooms, guestyVal: guesty.bedrooms },
    { label: 'Bathrooms', field: 'bathrooms', unitVal: unit.bathrooms, guestyVal: guesty.bathrooms },
    { label: 'Capacity', field: 'capacity', unitVal: unit.capacity, guestyVal: guesty.capacity },
    { label: 'Total beds', field: 'totalBeds', unitVal: unit.totalBeds, guestyVal: guesty.totalBeds },
    { label: 'Sq ft', field: 'sqft', unitVal: unit.sqft, guestyVal: guesty.sqft },
    { label: 'King beds', field: 'kings', unitVal: unit.kings, guestyVal: guesty.kings },
    { label: 'Queen beds', field: 'queens', unitVal: unit.queens, guestyVal: guesty.queens },
    { label: 'Twin beds', field: 'twins', unitVal: unit.twins, guestyVal: guesty.twins },
    { label: 'Property type', field: null, unitVal: unit.type, guestyVal: guesty.propertyType },
  ]

  const isDifferent = (u: number | string | null, g: number | string | null): boolean => {
    if (g === null || g === undefined || g === '') return false // nothing to compare against
    if (u === null || u === undefined || u === '') return true // unit missing a value Guesty has
    if (typeof u === 'number' || typeof g === 'number') return Number(u) !== Number(g)
    return String(u).trim().toLowerCase() !== String(g).trim().toLowerCase()
  }

  const diffCount = rows.filter((r) => isDifferent(r.unitVal, r.guestyVal)).length

  return (
    <div className="space-y-4">
      {/* Attached unit + detach */}
      <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-mvr-primary">Unit</h3>
          {editable && (
            <button
              type="button"
              onClick={() => patchListing(null)}
              disabled={busy}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-mvr-danger disabled:opacity-50"
            >
              <X className="size-3.5" />
              Detach
            </button>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm text-mvr-olive">
          <Building2 className="size-4 text-mvr-steel" />
          <span className="font-medium">
            {unit.buildingName ? `${unit.buildingName} · ` : ''}Unit {unit.number}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-mvr-success-light px-2 py-0.5 text-xs font-medium text-mvr-success">
            <Check className="size-3" /> Attached
          </span>
        </div>
      </div>

      {/* Comparison */}
      <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg text-mvr-primary">Unit vs Guesty</h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              diffCount > 0 ? 'bg-mvr-warning-light text-mvr-warning' : 'bg-mvr-success-light text-mvr-success'
            }`}
          >
            <ArrowLeftRight className="size-3" />
            {diffCount > 0 ? `${diffCount} difference${diffCount > 1 ? 's' : ''}` : 'In sync'}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          The unit is the source of truth. Copy a Guesty value only if you want to change the unit.
        </p>

        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="py-1.5 font-medium">Field</th>
              <th className="py-1.5 font-medium">Unit</th>
              <th className="py-1.5 font-medium">Guesty</th>
              <th className="py-1.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const differ = isDifferent(r.unitVal, r.guestyVal)
              return (
                <tr key={r.label} className={`border-t border-[#E0DBD4]/60 ${differ ? 'bg-mvr-warning-light/40' : ''}`}>
                  <td className="py-2 text-mvr-olive">{r.label}</td>
                  <td className="py-2 font-medium text-mvr-olive">{r.unitVal ?? '—'}</td>
                  <td className={`py-2 ${differ ? 'text-mvr-warning' : 'text-muted-foreground'}`}>
                    {r.guestyVal ?? '—'}
                  </td>
                  <td className="py-2 text-right">
                    {editable && differ && r.field && typeof r.guestyVal === 'number' && (
                      <button
                        type="button"
                        onClick={() => copyField(r.field as CopyField, r.guestyVal as number)}
                        disabled={busy}
                        title="Copy this Guesty value into the unit"
                        className="inline-flex items-center gap-1 rounded-full border border-[#E0DBD4] px-2 py-0.5 text-xs text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:opacity-50"
                      >
                        use Guesty
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Complete unit data (full editor, inline) */}
      {editable && unitFormDefaults && (
        <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
          <h3 className="font-display text-lg text-mvr-primary">Complete unit data</h3>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Fill the details Guesty can&rsquo;t provide (floor, line, view, features, photos, notes…).
          </p>
          <UnitForm
            key={unit.updatedAt}
            unitId={unit.id}
            buildings={prereqs.buildings}
            owners={prereqs.owners}
            defaultValues={unitFormDefaults}
            typeOptions={prereqs.typeOptions}
            viewOptions={prereqs.viewOptions}
            featureOptions={prereqs.featureOptions}
            bathTypeOptions={prereqs.bathTypeOptions}
            statusOptions={prereqs.statusOptions}
            onSaved={() => router.refresh()}
          />
        </div>
      )}
    </div>
  )
}

// ── Inline unit search picker (attach existing) ────────────────────────────────

interface UnitSearchResult {
  id: string
  number: string
  building: { name: string } | null
}

function UnitPicker({ onPick, disabled }: { onPick: (unitId: string) => void; disabled: boolean }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<UnitSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (q.trim()) params.set('search', q.trim())
        const res = await fetch(`/api/v1/units?${params.toString()}`)
        if (!res.ok) throw new Error()
        const json = (await res.json()) as { data: UnitSearchResult[] }
        setResults(json.data.slice(0, 8))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [q])

  return (
    <div>
      <div className="relative">
        <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search units by number…"
          className="w-full rounded-lg border border-[#E0DBD4] bg-white py-2 pl-9 pr-3 text-sm text-mvr-olive outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20"
        />
      </div>
      {q.trim() && (
        <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#E0DBD4]">
          {loading && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
          {!loading && results.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">No units found</li>
          )}
          {results.map((u) => (
            <li key={u.id} className="border-t border-[#E0DBD4]/60 first:border-t-0">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(u.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:opacity-50"
              >
                <span>
                  {u.building?.name ? `${u.building.name} · ` : ''}Unit {u.number}
                </span>
                <span className="text-xs text-mvr-primary">Attach</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
