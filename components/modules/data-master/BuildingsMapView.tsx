'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  MapPin, Phone, Mail, Clock, Globe, ExternalLink,
  Pencil, Trash2, X, Building2, ChevronRight, ChevronLeft,
  ChevronUp, ChevronDown, ChevronsUpDown, Images, Star,
  LogIn, LogOut,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BuildingMapItem } from './BuildingsMap'

const BuildingsMap = dynamic(() => import('./BuildingsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-mvr-neutral animate-pulse flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  ),
})

export interface BuildingFull extends BuildingMapItem {
  address:        string | null
  zipcode:        string | null
  googleUrl:      string | null
  website:        string | null
  imageUrl:       string | null
  frontdeskPhone: string | null
  frontdeskEmail: string | null
  frontdeskHours: string | null
  checkinHours:   string | null
  checkoutHours:  string | null
  amenities:      string[]
  unitCount:      number
  keyCount:       number
  ownerCount:     number
  totalSqft:      number
  totalCapacity:  number
  avgScore:       number | null
  createdAt:      string
  city?: { name: string; state?: { isoCode: string | null } | null } | null
}

type SortKey = 'name' | 'zone' | 'status' | 'unitCount' | 'ownerCount' | 'createdAt'
type SortDir = 'asc' | 'desc'

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
}

// Operational-score thresholds, matching the per-unit score colors on the detail page.
function scoreStyle(score: number): string {
  if (score >= 8) return 'bg-mvr-success/85 text-white'
  if (score >= 5) return 'bg-mvr-warning/85 text-white'
  return 'bg-mvr-danger/85 text-white'
}

function SortIndicator({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 ml-1 inline text-muted-foreground/40" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-mvr-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-mvr-primary" />
}

function BuildingPanel({ building, onClose }: { building: BuildingFull; onClose: () => void }) {
  const location = [building.address, building.zipcode].filter(Boolean).join(', ')

  const [galleryUrls, setGalleryUrls] = useState<string[]>([])
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx]   = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  // Fetch gallery URLs whenever the selected building changes
  useEffect(() => {
    setGalleryUrls([])
    setLightboxOpen(false)
    let cancelled = false
    fetch(`/api/v1/buildings/${building.id}/gallery`)
      .then((r) => r.json())
      .then((data: { urls?: string[] }) => {
        if (!cancelled) setGalleryUrls(data.urls ?? [])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [building.id])

  const openAt = (i: number) => { setLightboxIdx(i); setLightboxOpen(true) }
  const closeLightbox = useCallback(() => setLightboxOpen(false), [])
  const prev = useCallback(() => setLightboxIdx(i => (i - 1 + galleryUrls.length) % galleryUrls.length), [galleryUrls.length])
  const next = useCallback(() => setLightboxIdx(i => (i + 1) % galleryUrls.length), [galleryUrls.length])

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (!lightboxOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     closeLightbox()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxOpen, prev, next, closeLightbox])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!lightboxOpen || !stripRef.current) return
    const thumb = stripRef.current.children[lightboxIdx] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [lightboxIdx, lightboxOpen])

  // Touch swipe inside lightbox
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const onTouchEnd   = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -50) next()
    if (delta >  50) prev()
    touchStartX.current = null
  }

  const hasPhotos = galleryUrls.length > 0

  return (
    <>
    <div className="flex flex-col h-full bg-white rounded-xl border overflow-hidden shadow-panel">
      {/* Hero image */}
      <div className="relative h-52 shrink-0">
        {hasPhotos ? (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none"
            aria-label="View building photos"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryUrls[0]}
              alt={building.name}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="absolute inset-0 bg-mvr-primary/10 flex items-center justify-center">
            <Building2 className="w-14 h-14 text-mvr-primary/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/80 via-mvr-primary/20 to-transparent pointer-events-none" />

        {/* Close panel button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow transition-colors z-10"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>

        {/* Average score tag */}
        {building.avgScore !== null && (
          <span
            className={`absolute bottom-3 right-3 z-10 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm ${scoreStyle(building.avgScore)}`}
            title="Average unit score"
          >
            <Star className="w-3 h-3 fill-current" />
            {building.avgScore.toFixed(1)}
          </span>
        )}

        {/* Photo count badge */}
        {galleryUrls.length > 1 && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm transition-colors"
          >
            <Images className="w-3 h-3" />
            {galleryUrls.length}
          </button>
        )}

        <div className="absolute bottom-3 left-4 right-16 z-10 pointer-events-none">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border mb-1 ${STATUS_STYLES[building.status] ?? STATUS_STYLES.inactive}`}>
            {capitalize(building.status)}
          </span>
          <h3 className="text-lg font-bold text-white drop-shadow leading-tight">{building.name}</h3>
          {building.nickname && (
            <p className="text-white/70 text-xs mt-0.5">{building.nickname}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Overview — full-width row of stat cards */}
        <div className="p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Overview</p>
          <div className="grid grid-cols-4 gap-1.5">
            <div className="bg-mvr-neutral rounded-lg px-2 py-3 text-center">
              <p className="text-sm font-bold text-mvr-primary">{building.unitCount} / {building.keyCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Units / Keys</p>
            </div>
            <div className="bg-mvr-neutral rounded-lg px-2 py-3 text-center">
              <p className="text-sm font-bold text-mvr-primary">{building.ownerCount}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Owners</p>
            </div>
            <div className="bg-mvr-neutral rounded-lg px-2 py-3 text-center">
              <p className="text-sm font-bold text-mvr-primary">{building.totalSqft > 0 ? building.totalSqft.toLocaleString() : '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sq Ft</p>
            </div>
            <div className="bg-mvr-neutral rounded-lg px-2 py-3 text-center">
              <p className="text-sm font-bold text-mvr-primary">{building.totalCapacity > 0 ? building.totalCapacity : '—'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Capacity</p>
            </div>
          </div>
        </div>

        {/* Location + Front Desk — aligned two-column row */}
        <div className="grid grid-cols-2 divide-x divide-[#E0DBD4] border-t">
          {/* Left: location */}
          <div className="p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Location</p>
            {location && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-mvr-primary/60" />
                <span>{location}</span>
              </div>
            )}
            {building.zone && (
              <p className="text-xs text-muted-foreground pl-5">{building.zone}</p>
            )}
            {building.googleUrl && (
              <a href={building.googleUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                Google Maps
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {building.website && (
              <a href={building.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline">
                <Globe className="w-3.5 h-3.5 shrink-0" />
                Website
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          {/* Right: front desk */}
          <div className="p-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Front Desk</p>
            {building.frontdeskPhone && (
              <a href={`tel:${building.frontdeskPhone}`} className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline">
                <Phone className="w-3 h-3 shrink-0" />
                {building.frontdeskPhone}
              </a>
            )}
            {building.frontdeskEmail && (
              <a href={`mailto:${building.frontdeskEmail}`} className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline min-w-0">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{building.frontdeskEmail}</span>
              </a>
            )}
            {building.frontdeskHours && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{building.frontdeskHours}</span>
              </div>
            )}
            {(building.checkinHours || building.checkoutHours) && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {building.checkinHours && (
                  <span className="flex items-center gap-1.5" title="Check-in">
                    <LogIn className="w-3 h-3 shrink-0" />
                    {building.checkinHours}
                  </span>
                )}
                {building.checkoutHours && (
                  <span className="flex items-center gap-1.5" title="Check-out">
                    <LogOut className="w-3 h-3 shrink-0" />
                    {building.checkoutHours}
                  </span>
                )}
              </div>
            )}
            {!building.frontdeskPhone && !building.frontdeskEmail && !building.frontdeskHours && !building.checkinHours && !building.checkoutHours && (
              <p className="text-xs text-muted-foreground">No info on file.</p>
            )}
          </div>
        </div>

        {/* Amenities — full width */}
        {building.amenities.length > 0 && (
          <div className="p-4 space-y-1.5 border-t">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Amenities</p>
            <div className="flex flex-wrap gap-1">
              {building.amenities.slice(0, 6).map((a) => (
                <span key={a} className="px-1.5 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">
                  {a}
                </span>
              ))}
              {building.amenities.length > 6 && (
                <span className="text-xs text-muted-foreground px-1">+{building.amenities.length - 6} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      <div className="shrink-0 border-t p-3">
        <Link href={`/data-master/buildings/${building.id}`} className="block">
          <Button size="sm" className="w-full bg-mvr-primary hover:bg-mvr-primary/90">
            Full Details
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>

    {/* Lightbox */}
    {lightboxOpen && (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <p className="text-white/60 text-sm truncate max-w-[50%]">{building.name}</p>
          <span className="text-white text-sm font-medium tabular-nums">
            {lightboxIdx + 1} / {galleryUrls.length}
          </span>
          <button
            type="button"
            onClick={closeLightbox}
            className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main image */}
        <div
          className="flex-1 relative flex items-center justify-center min-h-0 px-14"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {galleryUrls.length > 1 && (
            <button
              type="button"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 active:bg-white/40 text-white rounded-full p-2.5 transition-colors z-10"
              aria-label="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={galleryUrls[lightboxIdx]}
            src={galleryUrls[lightboxIdx]}
            alt={`${building.name} — photo ${lightboxIdx + 1}`}
            referrerPolicy="no-referrer"
            className="max-h-full max-w-full object-contain rounded-lg"
            draggable={false}
          />

          {galleryUrls.length > 1 && (
            <button
              type="button"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 active:bg-white/40 text-white rounded-full p-2.5 transition-colors z-10"
              aria-label="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Thumbnail strip */}
        {galleryUrls.length > 1 && (
          <div className="shrink-0 py-3 px-4">
            <div
              ref={stripRef}
              className="flex gap-2 overflow-x-auto justify-center pb-1"
              style={{ scrollbarWidth: 'none' }}
            >
              {galleryUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIdx(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={[
                    'shrink-0 w-16 h-12 rounded-md overflow-hidden transition-all',
                    i === lightboxIdx
                      ? 'ring-2 ring-white opacity-100 scale-105'
                      : 'opacity-40 hover:opacity-75',
                  ].join(' ')}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Thumbnail ${i + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )}
    </>
  )
}

interface SectionTableProps {
  title:           string
  buildings:       BuildingFull[]
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
  { key: 'name',       label: 'Name' },
  { key: 'zone',       label: 'Zone' },
  { key: 'status',     label: 'Status' },
  { key: 'unitCount',  label: 'Units / Keys' },
  { key: 'ownerCount', label: 'Owners' },
  { key: 'createdAt',  label: 'Created' },
]

function SectionTable({
  title, buildings, selectedId, onSelect,
  confirmDeleteId, onConfirmDelete, onCancelDelete, onDelete,
  sortKey, sortDir, onSort,
}: SectionTableProps) {
  if (buildings.length === 0) return null

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-5 py-3 border-b bg-mvr-neutral">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} · {buildings.length}
        </p>
      </div>
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
            <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {buildings.map((b) => (
            <tr
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`cursor-pointer transition-colors ${
                selectedId === b.id ? 'bg-mvr-primary-light' : 'hover:bg-mvr-neutral/50'
              }`}
            >
              <td className="px-4 py-2.5">
                <span className="font-medium text-mvr-primary">{b.name}</span>
                {b.nickname && (
                  <span className="text-xs text-muted-foreground ml-2">({b.nickname})</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{b.zone ?? '—'}</td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[b.status] ?? STATUS_STYLES.inactive}`}>
                  {capitalize(b.status)}
                </span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                <span className="font-medium text-foreground">{b.unitCount}</span>
                <span> / {b.keyCount}</span>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{b.ownerCount}</td>
              <td className="px-4 py-2.5 text-muted-foreground text-xs">{b.createdAt}</td>
              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                {confirmDeleteId === b.id ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-mvr-danger font-medium">Delete?</span>
                    <button
                      onClick={() => onDelete(b.id)}
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
                      href={`/data-master/buildings/${b.id}/edit`}
                      className="p-1.5 rounded text-mvr-primary hover:bg-mvr-primary-light transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => onConfirmDelete(b.id)}
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
  )
}

export default function BuildingsMapView({ buildings }: { buildings: BuildingFull[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId]         = useState<string | null>(null)
  const [displayBuildings, setDisplayBuildings] = useState<BuildingFull[]>(buildings)
  const [confirmDeleteId, setConfirmDeleteId]   = useState<string | null>(null)
  const [sortKey, setSortKey]               = useState<SortKey>('name')
  const [sortDir, setSortDir]               = useState<SortDir>('asc')

  const selectedBuilding = displayBuildings.find((b) => b.id === selectedId) ?? null

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedBuildings = useMemo(() => {
    return [...displayBuildings].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number
      switch (sortKey) {
        case 'name':       aVal = a.name;          bVal = b.name;       break
        case 'zone':       aVal = a.zone ?? '';    bVal = b.zone ?? ''; break
        case 'status':     aVal = a.status;        bVal = b.status;     break
        case 'unitCount':  aVal = a.unitCount;     bVal = b.unitCount;  break
        case 'ownerCount': aVal = a.ownerCount;    bVal = b.ownerCount; break
        case 'createdAt':  aVal = a.createdAt;     bVal = b.createdAt;  break
        default:           aVal = a.name;          bVal = b.name
      }
      const dir = sortDir === 'asc' ? 1 : -1
      if (typeof aVal === 'number') return (aVal - (bVal as number)) * dir
      return aVal.localeCompare(bVal as string) * dir
    })
  }, [displayBuildings, sortKey, sortDir])

  const activeBuildings     = useMemo(() => sortedBuildings.filter((b) => b.status === 'active'),     [sortedBuildings])
  const onboardingBuildings = useMemo(() => sortedBuildings.filter((b) => b.status === 'onboarding'), [sortedBuildings])
  const inactiveBuildings   = useMemo(() => sortedBuildings.filter((b) => b.status === 'inactive'),   [sortedBuildings])

  function handleSelect(id: string) {
    setSelectedId((prev) => (prev === id ? null : id))
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/v1/buildings/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDisplayBuildings((prev) => prev.filter((b) => b.id !== id))
      setConfirmDeleteId(null)
      if (selectedId === id) setSelectedId(null)
      router.refresh()
    } catch {
      alert('Failed to delete building. Please try again.')
      setConfirmDeleteId(null)
    }
  }

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

  return (
    <div className="space-y-4">
      {/* Map + Panel */}
      <div className="flex gap-4 h-[520px]">
        <div className={`transition-all duration-300 ${selectedBuilding ? 'flex-1' : 'w-full'}`}>
          <BuildingsMap
            buildings={displayBuildings}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {selectedBuilding && (
          <div className="w-[440px] shrink-0">
            <BuildingPanel
              building={selectedBuilding}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* Section tables */}
      <div className="space-y-4">
        <SectionTable title="Active"      buildings={activeBuildings}     {...tableProps} />
        <SectionTable title="Onboarding"  buildings={onboardingBuildings} {...tableProps} />
        <SectionTable title="Inactive"    buildings={inactiveBuildings}   {...tableProps} />
      </div>
    </div>
  )
}
