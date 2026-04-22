'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, Trash2, X, ChevronRight, ChevronUp, ChevronDown,
  ChevronsUpDown, Home, User, Phone, Mail, Search,
  BedDouble, Bath, Maximize2, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const GCS_BASE = 'https://storage.googleapis.com/mvr-ops-hub-assets'

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${GCS_BASE}/${url}`
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface UnitFull {
  id: string
  number: string
  floor: number | null
  line: string | null
  view: string | null
  type: string | null
  bedrooms: number | null
  bathrooms: string | null
  sqft: number | null
  mt2: string | null
  capacity: number | null
  totalBeds: number | null
  kings: number
  queens: number
  twins: number
  hasKitchen: boolean
  hasBalcony: boolean
  photoUrls: string[]
  status: string
  score: string | null
  notes: string | null
  buildingId: string
  buildingName: string
  buildingNickname: string | null
  ownerUniqueId: string | null
  ownerNickname: string | null
  ownerPhone: string | null
  otherBeds: string | null
  listingCount: number
  createdAt: string
}

type SortKey = 'number' | 'buildingName' | 'type' | 'floor' | 'status' | 'ownerNickname' | 'listingCount'
type SortDir = 'asc' | 'desc'

// ── Constants ──────────────────────────────────────────────────────────────

export const TYPE_LABELS: Record<string, string> = {
  studio:    'Studio',
  one_br:    '1 BR',
  two_br:    '2 BR',
  three_br:  '3 BR',
  four_br:   '4 BR',
  penthouse: 'Penthouse',
  other:     'Other',
}

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
  renovation: 'bg-blue-50 text-blue-600 border-blue-200',
}

const STATUS_SECTIONS: { key: string; label: string }[] = [
  { key: 'active',     label: 'Active' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'renovation', label: 'Renovation' },
  { key: 'inactive',   label: 'Inactive' },
]

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function bedsLabel(u: UnitFull): string {
  const parts: string[] = []
  if (u.kings  > 0) parts.push(`${u.kings}K`)
  if (u.queens > 0) parts.push(`${u.queens}Q`)
  if (u.twins  > 0) parts.push(`${u.twins}T`)
  return parts.length ? parts.join(' ') : '—'
}

// ── Sort indicator ────────────────────────────────────────────────────────

function SortIndicator({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 ml-1 inline text-muted-foreground/40" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-mvr-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-mvr-primary" />
}

// ── Unit Detail Panel ─────────────────────────────────────────────────────

function UnitDetailPanel({ unit, onClose }: { unit: UnitFull; onClose: () => void }) {
  const heroUrl = resolveImageUrl(unit.photoUrls[0])

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border overflow-hidden shadow-panel">
      {/* Hero */}
      <div className="relative h-52 shrink-0">
        {heroUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroUrl})` }} />
        ) : (
          <div className="absolute inset-0 bg-mvr-primary/10 flex items-center justify-center">
            <Home className="w-14 h-14 text-mvr-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/80 via-mvr-primary/20 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow transition-colors z-10"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
        <div className="absolute bottom-3 left-4 right-10 z-10">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive}`}>
            {capitalize(unit.status)}
          </span>
          <h3 className="text-lg font-bold text-white drop-shadow leading-tight">
            Unit {unit.number}
          </h3>
          <p className="text-white/70 text-xs mt-0.5">{unit.buildingName}</p>
        </div>
      </div>

      {/* Two-column body */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 divide-x divide-[#E0DBD4]">
          {/* Left: overview + specs */}
          <div className="p-4 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Overview</p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="bg-mvr-neutral rounded-lg px-3 py-3 text-center">
                <p className="text-sm font-bold text-mvr-primary">{unit.listingCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">Listings</p>
              </div>
              <div className="bg-mvr-neutral rounded-lg px-3 py-3 text-center">
                <p className="text-sm font-bold text-mvr-primary">{unit.score ?? '—'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Score</p>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Specs</p>
              {unit.type && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Home className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>{TYPE_LABELS[unit.type] ?? unit.type}</span>
                </div>
              )}
              {unit.floor != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Maximize2 className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>Floor {unit.floor}{unit.line ? ` · Line ${unit.line}` : ''}</span>
                </div>
              )}
              {unit.view && (
                <div className="text-xs text-muted-foreground pl-4">View: {unit.view}</div>
              )}
              {unit.sqft && (
                <div className="text-xs text-muted-foreground pl-4">{unit.sqft.toLocaleString()} sqft</div>
              )}
              {unit.capacity != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>Capacity {unit.capacity}</span>
                </div>
              )}
              {unit.bedrooms != null && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>{unit.bedrooms} bed{unit.bedrooms !== 1 ? 's' : ''}</span>
                </div>
              )}
              {unit.bathrooms && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bath className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>{unit.bathrooms} bath{parseFloat(unit.bathrooms) !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: beds + features + owner */}
          <div className="p-4 space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Beds</p>
              {(unit.kings > 0 || unit.queens > 0 || unit.twins > 0) ? (
                <div className="space-y-0.5">
                  {unit.kings  > 0 && <p className="text-xs text-muted-foreground">{unit.kings} King{unit.kings > 1 ? 's' : ''}</p>}
                  {unit.queens > 0 && <p className="text-xs text-muted-foreground">{unit.queens} Queen{unit.queens > 1 ? 's' : ''}</p>}
                  {unit.twins  > 0 && <p className="text-xs text-muted-foreground">{unit.twins} Twin{unit.twins > 1 ? 's' : ''}</p>}
                  {unit.otherBeds && <p className="text-xs text-muted-foreground">{unit.otherBeds}</p>}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">—</p>
              )}
            </div>

            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Features</p>
              <div className="flex flex-wrap gap-1">
                {unit.hasKitchen && (
                  <span className="px-1.5 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Kitchen</span>
                )}
                {unit.hasBalcony && (
                  <span className="px-1.5 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Balcony</span>
                )}
                {!unit.hasKitchen && !unit.hasBalcony && (
                  <p className="text-xs text-muted-foreground">—</p>
                )}
              </div>
            </div>

            {unit.ownerNickname && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Owner</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="w-3 h-3 shrink-0 text-mvr-primary/60" />
                  <span>{unit.ownerNickname}</span>
                </div>
                {unit.ownerPhone && (
                  <a href={`tel:${unit.ownerPhone}`} className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline">
                    <Phone className="w-3 h-3 shrink-0" />
                    {unit.ownerPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t p-3">
        <Link href={`/data-master/units/${unit.id}`} className="block">
          <Button size="sm" className="w-full bg-mvr-primary hover:bg-mvr-primary/90">
            Full Details
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// ── Section Table ─────────────────────────────────────────────────────────

interface SectionTableProps {
  title:           string
  units:           UnitFull[]
  selectedId:      string | null
  onSelect:        (id: string) => void
  confirmDeleteId: string | null
  onConfirmDelete: (id: string) => void
  onCancelDelete:  () => void
  onDelete:        (id: string) => void
  sortKey:         SortKey
  sortDir:         SortDir
  onSort:          (key: SortKey) => void
}

const COLS: { key: SortKey; label: string }[] = [
  { key: 'number',       label: 'Unit #' },
  { key: 'buildingName', label: 'Building' },
  { key: 'type',         label: 'Type' },
  { key: 'floor',        label: 'Floor' },
  { key: 'status',       label: 'Status' },
  { key: 'ownerNickname', label: 'Owner' },
  { key: 'listingCount', label: 'Listings' },
]

function SectionTable({
  title, units, selectedId, onSelect,
  confirmDeleteId, onConfirmDelete, onCancelDelete, onDelete,
  sortKey, sortDir, onSort,
}: SectionTableProps) {
  if (units.length === 0) return null

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-mvr-neutral">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} · {units.length}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {COLS.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-mvr-primary select-none whitespace-nowrap"
                >
                  {label}
                  <SortIndicator col={key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Beds</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {units.map((u) => (
              <tr
                key={u.id}
                onClick={() => onSelect(u.id)}
                className={`cursor-pointer transition-colors ${
                  selectedId === u.id ? 'bg-mvr-primary-light' : 'hover:bg-mvr-neutral/50'
                }`}
              >
                <td className="px-4 py-2.5">
                  <span className="font-medium text-mvr-primary">{u.number}</span>
                  {u.line && <span className="text-xs text-muted-foreground ml-1">–{u.line}</span>}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  <span className="text-foreground font-medium">{u.buildingName}</span>
                  {u.buildingNickname && (
                    <span className="text-xs text-muted-foreground ml-1">({u.buildingNickname})</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {u.type ? (TYPE_LABELS[u.type] ?? u.type) : '—'}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.floor ?? '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[u.status] ?? STATUS_STYLES.inactive}`}>
                    {capitalize(u.status)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.ownerNickname ?? '—'}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{u.listingCount}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{bedsLabel(u)}</td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  {confirmDeleteId === u.id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-mvr-danger font-medium">Delete?</span>
                      <button
                        onClick={() => onDelete(u.id)}
                        className="px-2 py-0.5 text-xs rounded bg-mvr-danger text-white hover:bg-mvr-danger/90 transition-colors"
                      >
                        Yes
                      </button>
                      <button
                        onClick={onCancelDelete}
                        className="px-2 py-0.5 text-xs rounded bg-mvr-neutral text-foreground hover:bg-mvr-steel-light transition-colors"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5">
                      <Link
                        href={`/data-master/units/${u.id}/edit`}
                        className="p-1.5 rounded text-mvr-primary hover:bg-mvr-primary-light transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button
                        onClick={() => onConfirmDelete(u.id)}
                        className="p-1.5 rounded text-mvr-danger hover:bg-mvr-danger-light transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

interface UnitsTableViewProps {
  units:              UnitFull[]
  buildings:          { id: string; name: string }[]
  initialBuildingId?: string
}

export default function UnitsTableView({ units, buildings, initialBuildingId }: UnitsTableViewProps) {
  const router = useRouter()

  const [displayUnits, setDisplayUnits] = useState<UnitFull[]>(units)
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [sortKey, setSortKey]               = useState<SortKey>('number')
  const [sortDir, setSortDir]               = useState<SortDir>('asc')

  // Filters
  const [search,         setSearch]         = useState('')
  const [filterBuilding, setFilterBuilding] = useState(initialBuildingId ?? '')
  const [filterStatus,   setFilterStatus]   = useState('')
  const [filterType,     setFilterType]     = useState('')

  const selectedUnit = displayUnits.find((u) => u.id === selectedId) ?? null

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/units/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDisplayUnits((prev) => prev.filter((u) => u.id !== id))
      setConfirmDeleteId(null)
      if (selectedId === id) setSelectedId(null)
      router.refresh()
    } catch {
      alert('Failed to delete unit. Please try again.')
      setConfirmDeleteId(null)
    }
  }

  const filtered = useMemo(() => {
    return displayUnits.filter((u) => {
      if (filterBuilding && u.buildingId !== filterBuilding) return false
      if (filterStatus   && u.status    !== filterStatus)   return false
      if (filterType     && u.type      !== filterType)     return false
      if (search) {
        const q = search.toLowerCase()
        const match =
          u.number.toLowerCase().includes(q) ||
          u.buildingName.toLowerCase().includes(q) ||
          (u.ownerNickname?.toLowerCase().includes(q) ?? false) ||
          (u.view?.toLowerCase().includes(q) ?? false)
        if (!match) return false
      }
      return true
    })
  }, [displayUnits, filterBuilding, filterStatus, filterType, search])

  const sortedUnits = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      switch (sortKey) {
        case 'number':        aVal = a.number;               bVal = b.number;               break
        case 'buildingName':  aVal = a.buildingName;         bVal = b.buildingName;         break
        case 'type':          aVal = a.type ?? '';           bVal = b.type ?? '';           break
        case 'floor':         aVal = a.floor ?? 0;           bVal = b.floor ?? 0;           break
        case 'status':        aVal = a.status;               bVal = b.status;               break
        case 'ownerNickname': aVal = a.ownerNickname ?? '';  bVal = b.ownerNickname ?? '';  break
        case 'listingCount':  aVal = a.listingCount;         bVal = b.listingCount;         break
        default:              aVal = a.number;               bVal = b.number
      }
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof aVal === 'number') return (aVal - (bVal as number)) * dir
      return aVal.localeCompare(bVal as string) * dir
    })
  }, [filtered, sortKey, sortDir])

  const sectionsByStatus = useMemo(() => {
    return STATUS_SECTIONS.map(({ key, label }) => ({
      key,
      label,
      units: sortedUnits.filter((u) => u.status === key),
    })).filter((s) => s.units.length > 0)
  }, [sortedUnits])

  const tableProps = {
    selectedId,
    onSelect:        handleSelect,
    confirmDeleteId,
    onConfirmDelete: setConfirmDeleteId,
    onCancelDelete:  () => setConfirmDeleteId(null),
    onDelete:        handleDelete,
    sortKey,
    sortDir,
    onSort:          toggleSort,
  }

  const inputCls = 'text-sm border border-[#E0DBD4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary'

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Unit #, building, owner…"
              className={`${inputCls} pl-8 w-full`}
            />
          </div>
        </div>

        {/* Building */}
        <div className="w-52">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Building</label>
          <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)} className={inputCls}>
            <option value="">All buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="w-36">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="onboarding">Onboarding</option>
            <option value="renovation">Renovation</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Type */}
        <div className="w-36">
          <label className="block text-xs font-medium text-muted-foreground mb-1">Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputCls}>
            <option value="">All types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        {/* Clear */}
        {(search || filterBuilding || filterStatus || filterType) && (
          <button
            onClick={() => { setSearch(''); setFilterBuilding(''); setFilterStatus(''); setFilterType('') }}
            className="text-xs text-muted-foreground hover:text-mvr-primary underline self-end pb-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main layout: tables + side panel */}
      <div className="flex gap-4 items-start">
        {/* Tables */}
        <div className={`space-y-4 transition-all duration-300 ${selectedUnit ? 'flex-1 min-w-0' : 'w-full'}`}>
          {sectionsByStatus.length === 0 ? (
            <div className="bg-white rounded-xl border p-10 text-center">
              <p className="text-muted-foreground text-sm">No units match the current filters.</p>
            </div>
          ) : (
            sectionsByStatus.map(({ key, label, units: sectionUnits }) => (
              <SectionTable
                key={key}
                title={label}
                units={sectionUnits}
                {...tableProps}
              />
            ))
          )}
        </div>

        {/* Side panel */}
        {selectedUnit && (
          <div className="w-[440px] shrink-0 sticky top-4" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
            <UnitDetailPanel
              unit={selectedUnit}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
