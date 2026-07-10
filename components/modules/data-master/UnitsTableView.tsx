'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Pencil, X, ChevronRight, ChevronLeft, ChevronUp, ChevronDown,
  ChevronsUpDown, Home, User, Phone, Search, Building2,
  BedDouble, Bath, Maximize2, Users, Star, Layers,
  Eye, Hash, Plus, Camera, Check, SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EditUnitModal, type UnitFormOptions } from '@/components/modules/data-master/EditUnitModal'

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
  status: string
  score: string | null
  notes: string | null
  driveFolderUrl: string | null
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

type SortKey = 'number' | 'ownerNickname' | 'sqft' | 'capacity'
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
  churn:      'Churn',
  churned:    'Churned',
}

function statusLabel(s: string): string {
  return STATUS_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

const STATUS_DOT: Record<string, string> = {
  active:     'bg-mvr-success',
  onboarding: 'bg-mvr-warning',
  renovation: 'bg-blue-400',
  inactive:   'bg-[#ccc]',
  off_board:  'bg-mvr-danger',
  churn:      'bg-mvr-danger',
  churned:    'bg-mvr-danger',
}

// ── Utilities ─────────────────────────────────────────────────────────────

function _capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function _bedsLabel(u: UnitFull): string {
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
  onSelectBuilding: (buildingId: string) => void
}

function BuildingTreeNav({ allUnits, filterBuilding, onSelectBuilding }: BuildingTreeNavProps) {
  const buildings = useMemo(() => {
    const map = new Map<string, { id: string; name: string; nickname: string | null; count: number }>()
    for (const u of allUnits) {
      if (!map.has(u.buildingId)) {
        map.set(u.buildingId, { id: u.buildingId, name: u.buildingName, nickname: u.buildingNickname, count: 0 })
      }
      map.get(u.buildingId)!.count++
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [allUnits])

  const isAllActive = !filterBuilding

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-3 py-3 border-b bg-mvr-neutral flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5 text-mvr-primary/60" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buildings</p>
      </div>

      <div className="py-1">
        {/* All row */}
        <button
          onClick={() => onSelectBuilding('')}
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
          const isBuildingActive = filterBuilding === b.id
          return (
            <button
              key={b.id}
              onClick={() => onSelectBuilding(b.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-mvr-steel-light ${
                isBuildingActive ? 'bg-mvr-primary-light text-mvr-primary font-semibold' : 'text-foreground'
              }`}
            >
              <span className="truncate">{b.name}</span>
              <span className={`ml-1.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                isBuildingActive ? 'bg-mvr-primary text-white' : 'bg-mvr-neutral text-muted-foreground'
              }`}>
                {b.count}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Status filter ─────────────────────────────────────────────────────────

interface StatusFilterProps {
  statuses:  UnitFormOptions['status']
  selected:  string[]
  counts:    Record<string, number>
  onToggle:  (value: string) => void
  onShowAll: () => void
}

function StatusFilter({ statuses, selected, counts, onToggle, onShowAll }: StatusFilterProps) {
  const isAllActive = selected.length === 0

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-3 py-3 border-b bg-mvr-neutral flex items-center gap-1.5">
        <SlidersHorizontal className="w-3.5 h-3.5 text-mvr-primary/60" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
      </div>

      <div className="py-1">
        {/* All row — clears the filter (show everything) */}
        <button
          onClick={onShowAll}
          className={`w-full flex items-center px-3 py-2 text-xs transition-colors hover:bg-mvr-steel-light ${
            isAllActive ? 'bg-mvr-primary-light text-mvr-primary font-semibold' : 'text-foreground'
          }`}
        >
          All Statuses
        </button>

        {/* Per-status toggles */}
        {statuses.map((s) => {
          const isOn = selected.includes(s.value)
          return (
            <button
              key={s.id}
              onClick={() => onToggle(s.value)}
              aria-pressed={isOn}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-mvr-steel-light ${
                isOn ? 'bg-mvr-primary-light text-mvr-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-3.5 h-3.5 shrink-0 rounded border flex items-center justify-center transition-colors ${
                  isOn ? 'bg-mvr-primary border-mvr-primary' : 'bg-white border-[#CBCBCB]'
                }`}>
                  {isOn && <Check className="w-2.5 h-2.5 text-white" />}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full inline-block shrink-0 ${STATUS_DOT[s.value] ?? 'bg-[#ccc]'}`} />
                <span className="truncate">{s.label}</span>
              </div>
              <span className={`ml-1.5 shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                isOn ? 'bg-mvr-primary text-white' : 'bg-mvr-neutral text-muted-foreground'
              }`}>
                {counts[s.value] ?? 0}
              </span>
            </button>
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
  { key: 'capacity',      label: 'Capacity' },
]
// COLS (4) + Type + Line + View + Score + chevron = 9 columns total

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
      <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-10rem)]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b bg-mvr-cream">
              {/* Unit # — first 2 COLS are sortable (number, owner) */}
              {COLS.slice(0, 2).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-mvr-primary select-none whitespace-nowrap"
                >
                  {label}
                  <SortIndicator col={key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Type</th>
              {/* Sqft + Capacity sortable */}
              {COLS.slice(2).map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => onSort(key)}
                  className="text-left px-4 py-2.5 font-medium text-muted-foreground cursor-pointer hover:text-mvr-primary select-none whitespace-nowrap"
                >
                  {label}
                  <SortIndicator col={key} sortKey={sortKey} sortDir={sortDir} />
                </th>
              ))}
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">Line</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">View</th>
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
                    {/* Unit # + status dot */}
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[u.status] ?? 'bg-[#ccc]'}`} title={statusLabel(u.status)} />
                        <span className="font-medium text-mvr-primary">{u.number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 shrink-0 opacity-40" />
                        {u.ownerNickname ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Home className="w-3 h-3 shrink-0 opacity-40" />
                        {u.type ? (TYPE_LABELS[u.type] ?? u.type) : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="w-3 h-3 shrink-0 opacity-40" />
                        {u.sqft ? u.sqft.toLocaleString() : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 shrink-0 opacity-40" />
                        {u.capacity ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-3 h-3 shrink-0 opacity-40" />
                        {u.line ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">
                      <div className="flex items-center gap-1.5">
                        <Eye className="w-3 h-3 shrink-0 opacity-40" />
                        {u.view ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {u.score ? (
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3 h-3 shrink-0 opacity-40 text-muted-foreground" />
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${scoreStyle(u.score)}`}>
                            {u.score}
                          </span>
                        </div>
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

// ── Unit Panel Gallery ────────────────────────────────────────────────────

function UnitPanelGallery({ unit }: { unit: UnitFull }) {
  const [urls,    setUrls]    = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const thumbsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setCurrent(0)
    let cancelled = false
    fetch(`/api/v1/units/${unit.id}/gallery`)
      .then(r => r.json())
      .then((d: { urls?: string[] }) => { if (!cancelled) { setUrls(d.urls ?? []); setCurrent(0) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [unit.id])

  useEffect(() => {
    if (!thumbsRef.current) return
    const el = thumbsRef.current.children[current] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  const prev = () => setCurrent(i => (i - 1 + urls.length) % urls.length)
  const next = () => setCurrent(i => (i + 1) % urls.length)

  const overlay = (
    <>
      {/* Status top-left */}
      <div className="absolute top-2.5 left-2.5">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive}`}>
          {statusLabel(unit.status)}
        </span>
      </div>
      {/* Score top-right */}
      {unit.score && (
        <div className="absolute top-2.5 right-2.5">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${scoreStyle(unit.score)}`}>
            <Star className="w-3 h-3" />{unit.score}
          </span>
        </div>
      )}
      {/* Unit info bottom */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2.5 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent">
        <div className="min-w-0">
          <p className="text-white font-bold text-sm leading-tight drop-shadow">Unit {unit.number}</p>
          <p className="text-white/70 text-xs truncate">{unit.buildingName}</p>
        </div>
        {unit.sqft && (
          <span className="text-white/80 text-xs shrink-0 ml-2">{unit.sqft.toLocaleString()} sqft</span>
        )}
      </div>
    </>
  )

  if (loading) return (
    <div className="relative aspect-video bg-mvr-neutral animate-pulse overflow-hidden">
      <Camera className="absolute inset-0 m-auto w-8 h-8 text-muted-foreground/20" />
      {overlay}
    </div>
  )

  if (urls.length === 0) return (
    <div className="relative aspect-video bg-gradient-to-br from-mvr-primary to-[#2a3f5a] overflow-hidden">
      <Home className="absolute inset-0 m-auto w-10 h-10 text-white/10" />
      {overlay}
    </div>
  )

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-video overflow-hidden group">
        <img src={urls[current]} alt="Unit photo" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
        {urls.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            ><ChevronLeft className="w-4 h-4" /></button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            ><ChevronRight className="w-4 h-4" /></button>
          </>
        )}
        {overlay}
      </div>
      {/* Thumbnail strip */}
      {urls.length > 1 && (
        <div ref={thumbsRef} className="flex gap-1.5 overflow-x-auto px-2 py-2 bg-mvr-neutral/60">
          {urls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-11 h-11 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-mvr-primary' : 'border-transparent opacity-50 hover:opacity-90'
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
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
  onEdit:          () => void
}

function UnitDetailPanel({
  unit, index, total,
  onClose, onPrev, onNext, onEdit,
}: UnitDetailPanelProps) {
  const [commentText, setCommentText] = useState('')
  const [savedComments, setSavedComments] = useState<Array<{ id: string; text: string; date: string }>>([])

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
    <>
    {/* Card 1 — unit preview */}
    <div className="flex flex-col bg-white rounded-xl border overflow-hidden shadow-panel">
      {/* Gallery hero */}
      <div className="shrink-0 overflow-hidden rounded-t-xl">
        <UnitPanelGallery unit={unit} />
      </div>

      {/* Action bar */}
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
          <button
            onClick={onEdit}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg text-mvr-primary hover:bg-mvr-primary-light transition-colors font-medium"
          >
            <Pencil className="w-3 h-3" />Edit
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-mvr-steel-light transition-colors ml-0.5"
          >
            <X className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div>
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
                  <span className="capitalize">{unit.view}</span>
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
                {unit.otherBeds && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BedDouble className="w-3 h-3 shrink-0 opacity-40" />
                    <span>{unit.otherBeds}</span>
                  </div>
                )}
              </div>
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

        {/* Relationships */}
        <div className="px-4 pb-3 pt-1 space-y-1.5 border-t">
          <p className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 pt-3">Relationships</p>
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

      {/* Footer — Full Details */}
      <div className="shrink-0 border-t p-3">
        <Link href={`/data-master/units/${unit.id}`} className="block">
          <Button size="sm" className="w-full bg-mvr-primary hover:bg-mvr-primary/90">
            Full Details
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>

    {/* Card 2 — Activity & Comments */}
    <div className="bg-white rounded-xl border shadow-panel px-4 py-4 space-y-3">
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
    </>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

interface UnitsTableViewProps {
  units:              UnitFull[]
  buildings:          { id: string; name: string }[]
  owners:             { id: string; nickname: string }[]
  options:            UnitFormOptions
  initialBuildingId?: string
}

export default function UnitsTableView({ units, buildings, owners, options, initialBuildingId }: UnitsTableViewProps) {
  const [displayUnits, setDisplayUnits]       = useState<UnitFull[]>(units)
  const [selectedId, setSelectedId]           = useState<string | null>(null)
  const [editId, setEditId]                   = useState<string | null>(null)

  // Keep the client list in sync after the server refetches (e.g. once an edit saves).
  useEffect(() => { setDisplayUnits(units) }, [units])
  const [sortKey, setSortKey]                 = useState<SortKey>('number')
  const [sortDir, setSortDir]                 = useState<SortDir>('asc')
  const [search, setSearch]                   = useState('')
  const [filterBuilding, setFilterBuilding]   = useState(initialBuildingId ?? '')
  const [statusFilter, setStatusFilter]       = useState<string[]>([])

  function handleSelectBuilding(buildingId: string) {
    setFilterBuilding(buildingId)
    setSelectedId(null)
  }

  function toggleStatus(value: string) {
    setStatusFilter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }

  function showAllStatuses() {
    setStatusFilter([])
  }

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    return displayUnits.filter((u) => {
      if (filterBuilding && u.buildingId !== filterBuilding) return false
      if (statusFilter.length > 0 && !statusFilter.includes(u.status)) return false
      if (search) {
        const q = search.toLowerCase()
        const typeLabel = u.type ? (TYPE_LABELS[u.type] ?? u.type) : ''
        const match =
          u.number.toLowerCase().includes(q) ||
          u.buildingName.toLowerCase().includes(q) ||
          (u.ownerNickname?.toLowerCase().includes(q) ?? false) ||
          typeLabel.toLowerCase().includes(q) ||
          (u.type?.toLowerCase().includes(q) ?? false) ||
          (u.sqft ? String(u.sqft).includes(q) : false) ||
          (u.capacity ? String(u.capacity).includes(q) : false) ||
          (u.line?.toLowerCase().includes(q) ?? false) ||
          (u.view?.toLowerCase().includes(q) ?? false) ||
          (u.score ? u.score.includes(q) : false) ||
          statusLabel(u.status).toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })
  }, [displayUnits, filterBuilding, statusFilter, search])

  // Per-status counts within the current building context (ignores the status
  // filter itself so the toggle counts stay stable while selecting).
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const u of displayUnits) {
      if (filterBuilding && u.buildingId !== filterBuilding) continue
      counts[u.status] = (counts[u.status] ?? 0) + 1
    }
    return counts
  }, [displayUnits, filterBuilding])

  const sortedUnits = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      switch (sortKey) {
        case 'number':        aVal = a.number;               bVal = b.number;               break
        case 'ownerNickname': aVal = a.ownerNickname ?? '';  bVal = b.ownerNickname ?? '';  break
        case 'sqft':          aVal = a.sqft ?? 0;            bVal = b.sqft ?? 0;            break
        case 'capacity':      aVal = a.capacity ?? 0;        bVal = b.capacity ?? 0;        break
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
        {/* Left: building tree nav + status filter */}
        <div className="w-52 shrink-0 sticky top-4 space-y-4">
          <BuildingTreeNav
            allUnits={displayUnits}
            filterBuilding={filterBuilding}
            onSelectBuilding={handleSelectBuilding}
          />
          <StatusFilter
            statuses={options.status}
            selected={statusFilter}
            counts={statusCounts}
            onToggle={toggleStatus}
            onShowAll={showAllStatuses}
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
          <div className="w-[440px] shrink-0 sticky top-4 flex flex-col gap-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 5rem)' }}>
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
              onEdit={() => setEditId(selectedUnit.id)}
            />
          </div>
        )}
      </div>

      {/* Edit unit — centered modal on top of the list */}
      {editId && (
        <EditUnitModal
          unitId={editId}
          buildings={buildings}
          owners={owners}
          options={options}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  )
}
