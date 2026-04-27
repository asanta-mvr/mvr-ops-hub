'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, Trash2, X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ChevronsUpDown, Home, User, Phone, Search, Building2,
  BedDouble, Bath, Maximize2, Users, Star, Layers,
  Eye, Hash, MessageSquare, Plus,
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
  bathType:  string | null
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
  listingCount:   number
  documentCount?: number
  createdAt:      string
}

type SortKey = 'number' | 'ownerNickname' | 'sqft' | 'status' | 'listingCount'
type SortDir = 'asc' | 'desc'

// ── Constants ──────────────────────────────────────────────────────────────

import { TYPE_LABELS } from '@/lib/constants/units'

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
  renovation: 'bg-blue-50 text-blue-600 border-blue-200',
}

const STATUS_LABELS: Record<string, string> = {
  active:     'Active',
  onboarding: 'Onboarding',
  renovation: 'Renovation',
  inactive:   'Inactive',
  off_board:  'Off Board',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_DOT: Record<string, string> = {
  active:     'bg-mvr-success',
  onboarding: 'bg-mvr-warning',
  renovation: 'bg-blue-400',
  inactive:   'bg-[#ccc]',
}

// ── Utilities ─────────────────────────────────────────────────────────────

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

function scoreStyle(score: string | null): string {
  if (!score) return 'bg-mvr-neutral text-muted-foreground'
  const n = parseFloat(score)
  if (n >= 8) return 'bg-mvr-success-light text-mvr-success border border-mvr-success'
  if (n >= 5) return 'bg-mvr-warning-light text-mvr-warning border border-mvr-warning'
  return 'bg-mvr-danger-light text-mvr-danger border border-mvr-danger'
}

// ── Sort indicator ────────────────────────────────────────────────────────

function SortIndicator({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 ml-1 inline text-muted-foreground/40" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-mvr-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-mvr-primary" />
}

// ── Building Tree Nav ─────────────────────────────────────────────────────

interface BuildingTreeNavProps {
  allUnits:         UnitFull[]
  filterBuilding:   string
  filterStatus:     string
  onSelectBuilding: (buildingId: string, status?: string) => void
}

function BuildingTreeNav({ allUnits, filterBuilding, filterStatus, onSelectBuilding }: BuildingTreeNavProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const buildings = useMemo(() => {
    const map = new Map<string, {
      id: string; name: string; nickname: string | null
      count: number; statuses: Record<string, number>
    }>()
    for (const u of allUnits) {
      if (!map.has(u.buildingId)) {
        map.set(u.buildingId, { id: u.buildingId, name: u.buildingName, nickname: u.buildingNickname, count: 0, statuses: {} })
      }
      const entry = map.get(u.buildingId)!
      entry.count++
      entry.statuses[u.status] = (entry.statuses[u.status] ?? 0) + 1
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allUnits])

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isAllActive = !filterBuilding && !filterStatus

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-3 py-3 border-b bg-mvr-neutral flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-mvr-primary/60" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buildings</p>
      </div>

      <div className="py-1">
        {/* All row */}
        <button
          onClick={() => onSelectBuilding('', '')}
          className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-mvr-steel-light ${
            isAllActive ? 'bg-mvr-primary-light text-mvr-primary font-semibold' : 'text-foreground'
          }`}
        >
          <span>All Buildings</span>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
            isAllActive ? 'bg-mvr-primary text-white' : 'bg-mvr-neutral text-muted-foreground'
          }`}>
            {allUnits.length}
          </span>
        </button>

        {/* Per-building rows */}
        {buildings.map((b) => {
          const isBuildingActive = filterBuilding === b.id && !filterStatus
          const isExpanded = expanded.has(b.id)
          const displayName = b.name

          return (
            <div key={b.id}>
              <div className={`flex items-center gap-1 px-3 py-2 text-xs transition-colors hover:bg-mvr-steel-light ${
                isBuildingActive ? 'bg-mvr-primary-light' : ''
              }`}>
                <button
                  onClick={() => toggleExpand(b.id)}
                  className="shrink-0 p-0.5 rounded hover:bg-mvr-neutral transition-colors"
                >
                  {isExpanded
                    ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
                <button
                  onClick={() => onSelectBuilding(b.id)}
                  className={`flex-1 flex items-center justify-between min-w-0 ${
                    isBuildingActive ? 'text-mvr-primary font-semibold' : 'text-foreground'
                  }`}
                >
                  <span className="truncate">{displayName}</span>
                  <span className={`ml-1.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                    isBuildingActive ? 'bg-mvr-primary text-white' : 'bg-mvr-neutral text-muted-foreground'
                  }`}>
                    {b.count}
                  </span>
                </button>
              </div>

              {/* Status sub-items */}
              {isExpanded && (
                <div className="pl-6 pb-1">
                  {Object.entries(b.statuses)
                    .sort((a, b) => a[0].localeCompare(b[0]))
                    .map(([s, count]) => {
                      const isStatusActive = filterBuilding === b.id && filterStatus === s
                      return (
                        <button
                          key={s}
                          onClick={() => onSelectBuilding(b.id, s)}
                          className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors hover:bg-mvr-steel-light ${
                            isStatusActive ? 'bg-mvr-primary-light text-mvr-primary font-semibold' : 'text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${STATUS_DOT[s] ?? 'bg-[#ccc]'}`} />
                            <span>{statusLabel(s)}</span>
                          </div>
                          <span className="rounded-full px-1.5 py-0.5 text-[10px] bg-mvr-neutral text-muted-foreground">
                            {count}
                          </span>
                        </button>
                      )
                    })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Unified Floor Table ───────────────────────────────────────────────────
// Single <table> with floor-group separator rows so all columns stay aligned.

const COLS: { key: SortKey; label: string }[] = [
  { key: 'number',        label: 'Unit #'   },
  { key: 'ownerNickname', label: 'Owner'    },
  { key: 'sqft',          label: 'Sqft'     },
  { key: 'status',        label: 'Status'   },
  { key: 'listingCount',  label: 'Listings' },
]
// COLS (5) + View + Line + Score + chevron = 9 columns total

interface UnifiedFloorTableProps {
  floorGroups: { label: string; units: UnitFull[] }[]
  selectedId:  string | null
  onSelect:    (id: string) => void
  sortKey:     SortKey
  sortDir:     SortDir
  onSort:      (key: SortKey) => void
}

function UnifiedFloorTable({
  floorGroups, selectedId, onSelect, sortKey, sortDir, onSort,
}: UnifiedFloorTableProps) {
  if (floorGroups.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-10 text-center">
        <p className="text-muted-foreground text-sm">No units match the current filters.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-mvr-cream">
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
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">View</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Line</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Score</th>
              <th className="px-4 py-2.5 w-6" />
            </tr>
          </thead>
          <tbody>
            {floorGroups.map(({ label, units }) => (
              <React.Fragment key={label}>
                {/* Floor separator row */}
                <tr className="border-y border-[#E0DBD4]">
                  <td colSpan={9} className="px-5 py-2 bg-mvr-neutral">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-mvr-primary/50 shrink-0" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                      </span>
                    </div>
                  </td>
                </tr>
                {/* Unit rows */}
                {units.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => onSelect(u.id)}
                    className={`cursor-pointer transition-colors border-b border-[#E0DBD4] last:border-0 ${
                      selectedId === u.id ? 'bg-mvr-primary-light' : 'hover:bg-mvr-neutral/50'
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-mvr-primary">{u.number}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.ownerNickname ?? '—'}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {u.sqft ? u.sqft.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        STATUS_STYLES[u.status] ?? STATUS_STYLES.inactive
                      }`}>
                        {statusLabel(u.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{u.listingCount}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.view ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{u.line ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      {u.score ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreStyle(u.score)}`}>
                          {u.score}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <ChevronRight className="w-3.5 h-3.5 text-mvr-primary/30" />
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Unit Detail Panel ─────────────────────────────────────────────────────

interface UnitDetailPanelProps {
  unit:            UnitFull
  index:           number
  total:           number
  onClose:         () => void
  onPrev:          () => void
  onNext:          () => void
  confirmDelete:   boolean
  onConfirmDelete: () => void
  onCancelDelete:  () => void
  onDelete:        (id: string) => void
}

function UnitDetailPanel({
  unit, index, total,
  onClose, onPrev, onNext,
  confirmDelete, onConfirmDelete, onCancelDelete, onDelete,
}: UnitDetailPanelProps) {
  const heroUrl = resolveImageUrl(unit.photoUrls[0])
  const [commentText, setCommentText] = useState('')
  const [savedComments, setSavedComments] = useState<Array<{ id: string; text: string; date: string }>>([])
  const [photoModalOpen, setPhotoModalOpen] = useState(false)

  function handleAddComment() {
    if (!commentText.trim()) return
    setSavedComments(prev => [...prev, {
      id: Date.now().toString(),
      text: commentText.trim(),
      date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    }])
    setCommentText('')
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border overflow-hidden shadow-panel">
      {/* Hero */}
      <div className="relative h-60 shrink-0">
        {heroUrl ? (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroUrl})` }} />
        ) : (
          <div className="absolute inset-0 bg-mvr-primary/10 flex items-center justify-center">
            <Home className="w-12 h-12 text-mvr-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/80 via-mvr-primary/20 to-transparent" />
        {unit.score && (
          <div className="absolute top-3 right-3 z-10">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm ${scoreStyle(unit.score)}`}>
              <Star className="w-3 h-3" />{unit.score}
            </span>
          </div>
        )}
        <div className="absolute bottom-3 left-4 right-4 z-10 flex items-end justify-between gap-2">
          <div className="min-w-0">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${
              STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive
            }`}>
              {statusLabel(unit.status)}
            </span>
            <h3 className="text-base font-bold text-white drop-shadow leading-tight">Unit {unit.number}</h3>
            <p className="text-white/70 text-xs mt-0.5">{unit.buildingName}</p>
          </div>
          {unit.sqft && (
            <div className="shrink-0 bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 flex items-center gap-1 text-xs font-semibold text-mvr-primary">
              <Maximize2 className="w-3 h-3" />
              {unit.sqft.toLocaleString()} sqft
            </div>
          )}
        </div>
      </div>

      {/* Action header */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-mvr-neutral/50">
        {/* Nav arrows + counter */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrev}
            disabled={index <= 0}
            className="p-1 rounded hover:bg-mvr-steel-light disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-mvr-primary" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums px-1">{index + 1} / {total}</span>
          <button
            onClick={onNext}
            disabled={index >= total - 1}
            className="p-1 rounded hover:bg-mvr-steel-light disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5 text-mvr-primary" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-mvr-danger font-medium">Delete?</span>
              <button
                onClick={() => onDelete(unit.id)}
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
            <>
              <Link
                href={`/data-master/units/${unit.id}/edit`}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-mvr-primary hover:bg-mvr-primary-light transition-colors font-medium"
              >
                <Pencil className="w-3 h-3" />Edit
              </Link>
              <button
                onClick={onConfirmDelete}
                className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-mvr-danger hover:bg-mvr-danger-light transition-colors font-medium"
              >
                <Trash2 className="w-3 h-3" />Delete
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-mvr-steel-light transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* 2-column grid: Unit Detail | Accommodation */}
        <div className="grid grid-cols-2 gap-x-5 p-4 pb-3">
          {/* ── Left: Unit Detail ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Unit Detail</p>
            <div className="space-y-2">
              {unit.type && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Home className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  <span>{TYPE_LABELS[unit.type] ?? unit.type}</span>
                </div>
              )}
              {unit.floor != null && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Layers className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  <span>Floor {unit.floor}</span>
                </div>
              )}
              {unit.line && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Hash className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  <span>{unit.line}</span>
                </div>
              )}
              {unit.view && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  <span>{unit.view}</span>
                </div>
              )}
            </div>
            {/* Others: features */}
            {(unit.hasKitchen || unit.hasBalcony) && (
              <div className="space-y-1.5 pt-1">
                <p className="text-xs font-medium text-muted-foreground">Others</p>
                <div className="flex flex-wrap gap-1">
                  {unit.hasKitchen && (
                    <span className="px-2 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border border-[#E0DBD4]">Kitchen</span>
                  )}
                  {unit.hasBalcony && (
                    <span className="px-2 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border border-[#E0DBD4]">Balcony</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Accommodation ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Accommodation</p>
            <div className="flex gap-4">
              {/* Capacity / beds / bath */}
              <div className="flex-1 space-y-2">
                {unit.capacity != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Users className="w-3 h-3 shrink-0 opacity-40" />
                    <span>Cap. {unit.capacity}</span>
                  </div>
                )}
                {unit.bedrooms != null && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BedDouble className="w-3 h-3 shrink-0 opacity-40" />
                    <span>{unit.bedrooms} beds</span>
                  </div>
                )}
                {unit.bathrooms && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Bath className="w-3 h-3 shrink-0 opacity-40" />
                    <span>
                      {unit.bathrooms} bath{unit.bathType ? ` / ${unit.bathType}` : ''}
                    </span>
                  </div>
                )}
              </div>
              {/* Bed types — always show all three */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="w-3 h-3 shrink-0 opacity-40" />
                  <span>{unit.kings} King</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="w-3 h-3 shrink-0 opacity-40" />
                  <span>{unit.queens} Queen</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BedDouble className="w-3 h-3 shrink-0 opacity-40" />
                  <span>{unit.twins} Twin</span>
                </div>
              </div>
            </div>
            {/* Photos */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Photos</p>
              {unit.photoUrls.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {unit.photoUrls.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoModalOpen(true)}
                      className="px-2 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border border-[#E0DBD4] hover:bg-mvr-steel-light transition-colors"
                    >
                      {i === 0 ? 'Preliminary' : `Photo ${i + 1}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/40">No photos</p>
              )}
            </div>
          </div>
        </div>

        {/* Owner */}
        {unit.ownerNickname && (
          <div className="px-4 pb-3 pt-1 space-y-1.5 border-t">
            <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 pt-3">Owner</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="w-3 h-3 shrink-0 opacity-40" />
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

        {/* Activity & Comments */}
        <div className="px-4 pt-3 pb-4 space-y-3 border-t">
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70">Activity & Comments</p>
          {/* Saved comments list */}
          {savedComments.length > 0 && (
            <div className="space-y-2">
              {savedComments.map((c) => (
                <div key={c.id} className="group relative bg-mvr-neutral rounded-xl px-3 py-2.5">
                  <p className="text-xs text-foreground leading-relaxed pr-6">{c.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{c.date}</p>
                  <button
                    onClick={() => setSavedComments(prev => prev.filter(x => x.id !== c.id))}
                    className="absolute top-2 right-2 p-0.5 rounded text-muted-foreground/40 hover:text-mvr-danger hover:bg-mvr-danger-light opacity-0 group-hover:opacity-100 transition-all"
                    title="Delete comment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {/* Input */}
          <div className="space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment or note…"
              rows={3}
              className="w-full text-xs border border-[#E0DBD4] rounded-xl px-3 py-2.5 bg-white resize-none focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            />
            <button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              className="w-full py-2 text-xs rounded-xl bg-mvr-primary text-white hover:bg-mvr-primary/90 disabled:opacity-40 transition-colors font-semibold tracking-wide"
            >
              Add Comment
            </button>
          </div>
        </div>
      </div>

      {/* Photo lightbox modal */}
      {photoModalOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPhotoModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <p className="text-sm font-semibold text-mvr-primary">
                Photos · {unit.photoUrls.length}
              </p>
              <button
                onClick={() => setPhotoModalOpen(false)}
                className="p-1 rounded hover:bg-mvr-neutral transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-2 gap-3">
              {unit.photoUrls.map((url, i) => {
                const resolved = resolveImageUrl(url)
                return (
                  <a key={i} href={resolved ?? '#'} target="_blank" rel="noopener noreferrer" className="block">
                    {resolved ? (
                      <img
                        src={resolved}
                        alt={`Photo ${i + 1}`}
                        className="w-full aspect-video object-cover rounded-xl hover:opacity-90 transition-opacity border border-[#E0DBD4]"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-xl bg-mvr-neutral flex items-center justify-center border border-[#E0DBD4]">
                        <Home className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 truncate px-0.5">
                      {i === 0 ? 'Preliminary' : `Photo ${i + 1}`}
                    </p>
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="shrink-0 border-t p-3 space-y-2">
        <Link href={`/data-master/units/${unit.id}`} className="block">
          <Button size="sm" className="w-full bg-mvr-primary hover:bg-mvr-primary/90">
            Full Details
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/data-master/units/${unit.id}#listings`}
            className="flex-1 text-center text-xs py-1.5 rounded-lg border border-[#E0DBD4] hover:bg-mvr-steel-light transition-colors text-muted-foreground hover:text-mvr-primary"
          >
            Listings ({unit.listingCount})
          </Link>
          <Link
            href={`/data-master/units/${unit.id}#documentation`}
            className="flex-1 text-center text-xs py-1.5 rounded-lg border border-[#E0DBD4] hover:bg-mvr-steel-light transition-colors text-muted-foreground hover:text-mvr-primary flex items-center justify-center gap-1.5"
          >
            Documentation
            <span className="inline-flex items-center justify-center min-w-[1rem] h-4 px-1 rounded-full bg-mvr-neutral text-[10px] font-semibold">
              {unit.documentCount ?? 0}
            </span>
          </Link>
        </div>
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

export default function UnitsTableView({ units, initialBuildingId }: UnitsTableViewProps) {
  const router = useRouter()

  const [displayUnits, setDisplayUnits]       = useState<UnitFull[]>(units)
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [sortKey, setSortKey]                 = useState<SortKey>('number')
  const [sortDir, setSortDir]                 = useState<SortDir>('asc')
  const [search, setSearch]                   = useState('')
  const [filterBuilding, setFilterBuilding]   = useState(initialBuildingId ?? '')
  const [filterStatus, setFilterStatus]       = useState('')

  function handleSelectBuilding(buildingId: string, status?: string) {
    setFilterBuilding(buildingId)
    setFilterStatus(status ?? '')
    setSelectedId(null)
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
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
  }, [displayUnits, filterBuilding, filterStatus, search])

  const sortedUnits = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      switch (sortKey) {
        case 'number':        aVal = a.number;               bVal = b.number;               break
        case 'ownerNickname': aVal = a.ownerNickname ?? '';  bVal = b.ownerNickname ?? '';  break
        case 'sqft':          aVal = a.sqft ?? 0;            bVal = b.sqft ?? 0;            break
        case 'status':        aVal = a.status;               bVal = b.status;               break
        case 'listingCount':  aVal = a.listingCount;         bVal = b.listingCount;         break
        default:              aVal = a.number;               bVal = b.number
      }
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof aVal === 'number') return (aVal - (bVal as number)) * dir
      return aVal.localeCompare(bVal as string) * dir
    })
  }, [filtered, sortKey, sortDir])

  const floorGroups = useMemo(() => {
    const map = new Map<number | null, UnitFull[]>()
    for (const u of sortedUnits) {
      const key = u.floor ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(u)
    }
    const numbered = Array.from(map.entries())
      .filter((e): e is [number, UnitFull[]] => e[0] !== null)
      .sort(([a], [b]) => a - b)
    const noFloor = map.get(null)
    return [
      ...numbered.map(([floor, floorUnits]) => ({ label: `Floor ${floor}`, units: floorUnits })),
      ...(noFloor?.length ? [{ label: 'No Floor', units: noFloor }] : []),
    ]
  }, [sortedUnits])

  const selectedUnit  = displayUnits.find((u) => u.id === selectedId) ?? null
  const selectedIndex = sortedUnits.findIndex((u) => u.id === selectedId)

  const tableProps = {
    selectedId,
    onSelect: handleSelect,
    sortKey,
    sortDir,
    onSort:   toggleSort,
  }

  return (
    <div className="space-y-4">
      {/* Top bar: title (left) + search + new unit (right) */}
      <div className="flex items-center justify-between gap-6">
        <div className="w-52 shrink-0">
          <h1 className="text-2xl font-bold text-mvr-primary">Units</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{displayUnits.length} units in portfolio</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unit #, owner, view…"
              className="w-full text-sm border border-[#E0DBD4] rounded-xl pl-9 pr-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary"
            />
          </div>
          <Link href="/data-master/units/new">
            <Button className="bg-mvr-primary hover:bg-mvr-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Unit
            </Button>
          </Link>
        </div>
      </div>

      {/* 3-column layout: tree nav | floor tables | detail panel */}
      <div className="flex gap-4 items-start">
        {/* Left: building tree nav */}
        <div className="w-52 shrink-0 sticky top-4">
          <BuildingTreeNav
            allUnits={displayUnits}
            filterBuilding={filterBuilding}
            filterStatus={filterStatus}
            onSelectBuilding={handleSelectBuilding}
          />
        </div>

        {/* Center: unified floor table */}
        <div className="flex-1 min-w-0">
          <UnifiedFloorTable
            floorGroups={floorGroups}
            {...tableProps}
          />
        </div>

        {/* Right: detail panel */}
        {selectedUnit && (
          <div className="w-[440px] shrink-0 sticky top-4" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
            <UnitDetailPanel
              unit={selectedUnit}
              index={selectedIndex}
              total={sortedUnits.length}
              onClose={() => setSelectedId(null)}
              onPrev={() => {
                if (selectedIndex > 0) setSelectedId(sortedUnits[selectedIndex - 1].id)
              }}
              onNext={() => {
                if (selectedIndex < sortedUnits.length - 1) setSelectedId(sortedUnits[selectedIndex + 1].id)
              }}
              confirmDelete={confirmDeleteId === selectedUnit.id}
              onConfirmDelete={() => setConfirmDeleteId(selectedUnit.id)}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}
