'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, LayoutList, FileText, ClipboardCheck, Star,
  User, Phone, Mail, ExternalLink, BedDouble, Bath, Maximize2,
  Home, Layers, Users, ChevronLeft, ChevronRight, X, Camera,
  Building2, Hash, Eye, Calendar, Clock,
} from 'lucide-react'
import { TYPE_LABELS } from '@/lib/constants/units'

type Tab = 'detail' | 'listings' | 'contracts' | 'inspections' | 'score'

export interface UnitDetailTabsProps {
  unitId:          string
  number:          string
  status:          string
  type:            string | null
  floor:           number | null
  line:            string | null
  view:            string | null
  sqft:            number | null
  mt2:             string | null
  capacity:        number | null
  amenityCap:      number | null
  totalBeds:       number | null
  bedrooms:        number | null
  bathrooms:       string | null
  bathType:        string | null
  kings:           number
  queens:          number
  twins:           number
  otherBeds:       string | null
  hasKitchen:      boolean
  hasBalcony:      boolean
  features:        string[]
  driveFolderUrl:  string | null
  photoQuality:    string | null
  score:           string | null
  notes:           string | null
  createdAt:       string
  updatedAt:       string
  listingCount:    number
  contractCount:   number
  inspectionCount: number
  buildingName:    string
  buildingId:      string
  ownerId:         string | null
  ownerNickname:   string | null
  ownerPhone:      string | null
  ownerEmail:      string | null
  listings:        { id: string; name: string; nickname: string | null; guestyId: string | null }[]
}

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888]',
  renovation: 'bg-blue-50 text-blue-600',
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

// ── Gallery ───────────────────────────────────────────────────────────────────

function UnitGallery({ unitId }: { unitId: string }) {
  const [urls,    setUrls]    = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const thumbsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    let cancelled = false
    fetch(`/api/v1/units/${unitId}/gallery`)
      .then(r => r.json())
      .then((d: { urls?: string[] }) => { if (!cancelled) { setUrls(d.urls ?? []); setCurrent(0) } })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [unitId])

  useEffect(() => {
    if (!thumbsRef.current) return
    const el = thumbsRef.current.children[current] as HTMLElement | undefined
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [current])

  const prev = () => setCurrent(i => (i - 1 + urls.length) % urls.length)
  const next = () => setCurrent(i => (i + 1) % urls.length)

  if (loading) return (
    <div className="aspect-square bg-mvr-neutral animate-pulse rounded-xl flex items-center justify-center">
      <Camera className="w-8 h-8 text-muted-foreground/20" />
    </div>
  )

  if (urls.length === 0) return (
    <div className="aspect-square bg-mvr-neutral rounded-xl flex flex-col items-center justify-center gap-2">
      <Home className="w-10 h-10 text-mvr-primary/20" />
      <p className="text-xs text-muted-foreground">No photos</p>
    </div>
  )

  return (
    <>
      <div className="space-y-2">
        <div
          className="relative aspect-square rounded-xl overflow-hidden bg-mvr-neutral group cursor-zoom-in"
          onClick={() => setLightbox(true)}
        >
          <img src={urls[current]} alt="Unit photo" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          {urls.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              ><ChevronLeft className="w-4 h-4" /></button>
              <button
                onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
              ><ChevronRight className="w-4 h-4" /></button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/40 text-white text-xs px-2 py-0.5 rounded-full">
                {current + 1} / {urls.length}
              </div>
            </>
          )}
        </div>
        {urls.length > 1 && (
          <div ref={thumbsRef} className="flex gap-1.5 overflow-x-auto pb-1">
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                  i === current ? 'border-mvr-primary' : 'border-transparent opacity-50 hover:opacity-90'
                }`}
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white" onClick={() => setLightbox(false)}>
            <X className="w-5 h-5" />
          </button>
          {urls.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prev() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button onClick={e => { e.stopPropagation(); next() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
          <img
            src={urls[current]} alt=""
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/50 text-sm">{current + 1} / {urls.length}</div>
        </div>
      )}
    </>
  )
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function Field({
  label, value, icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide flex items-center gap-1">
        {Icon && <Icon className="w-3 h-3 shrink-0" />}
        {label}
      </p>
      <div className="text-sm font-medium text-foreground">{value ?? <span className="text-muted-foreground/50">—</span>}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold uppercase tracking-widest text-mvr-sand border-b border-[#E0DBD4] pb-1.5">{title}</h3>
      {children}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UnitDetailTabs(props: UnitDetailTabsProps) {
  const [tab, setTab] = useState<Tab>('detail')

  const {
    unitId, number, status, type, floor, line, view, sqft, mt2, capacity, amenityCap,
    totalBeds, bedrooms, bathrooms, bathType, kings, queens, twins, otherBeds,
    hasKitchen, hasBalcony, features, driveFolderUrl, photoQuality, score, notes,
    createdAt, updatedAt, listingCount, contractCount, inspectionCount,
    buildingName, buildingId, ownerId, ownerNickname, ownerPhone, ownerEmail,
    listings,
  } = props

  const tabs: { key: Tab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'detail',      label: 'Detail',      Icon: LayoutDashboard },
    { key: 'listings',    label: 'Listings',    Icon: LayoutList      },
    { key: 'contracts',   label: 'Contracts',   Icon: FileText        },
    { key: 'inspections', label: 'Inspections', Icon: ClipboardCheck  },
    { key: 'score',       label: 'Score',       Icon: Star            },
  ]

  const scoreNum = score ? parseFloat(score) : null

  return (
    <div className="space-y-4">

      {/* ── Tab nav ── */}
      <div className="grid grid-cols-5 gap-3">
        {tabs.map(({ key, label, Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-xl border px-3 py-4 text-center transition-all flex flex-col items-center gap-2 ${
                active
                  ? 'bg-mvr-primary border-mvr-primary shadow-card'
                  : 'bg-white hover:bg-mvr-neutral/50 border-[#E0DBD4]'
              }`}
            >
              <Icon className="w-5 h-5 text-mvr-sand" />
              <p className={`text-[11px] leading-tight font-medium ${active ? 'text-white/80' : 'text-muted-foreground'}`}>{label}</p>
            </button>
          )
        })}
      </div>

      {/* ── Body: gallery + content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">

        {/* Left: photo carousel */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-3 items-center">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Photos</h2>
            <div className="flex justify-center">
              {driveFolderUrl && (
                <a
                  href={driveFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-mvr-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open Drive folder
                </a>
              )}
            </div>
            <div className="flex justify-end">
              {photoQuality && (
                <span className={[
                  'text-xs px-2 py-0.5 rounded-full border font-medium',
                  photoQuality === 'pro'         ? 'bg-mvr-success-light text-mvr-success border-mvr-success' :
                  photoQuality === 'preliminary' ? 'bg-mvr-warning-light text-mvr-warning border-mvr-warning' :
                                                   'bg-mvr-neutral text-muted-foreground border-[#ccc]',
                ].join(' ')}>
                  {photoQuality === 'pro' ? 'Pro' : photoQuality === 'preliminary' ? 'Preliminary' : 'Low Quality'}
                </span>
              )}
            </div>
          </div>
          <UnitGallery unitId={unitId} />
        </div>

        {/* Right: tab content */}
        <div className="lg:col-span-2 space-y-4">

          {/* ── DETAIL ── */}
          {tab === 'detail' && (
            <div className="bg-white rounded-xl border p-5 space-y-6">

              <Section title="Identity">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Field label="Unit #"    value={number}                                    icon={Hash} />
                  <Field label="Building"
                    value={<Link href={`/data-master/buildings/${buildingId}`} className="text-mvr-primary hover:underline">{buildingName}</Link>}
                    icon={Building2}
                  />
                  <Field label="Status"
                    value={<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.inactive}`}>{cap(status)}</span>}
                  />
                  <Field label="Type"     value={type ? (TYPE_LABELS[type] ?? type) : null}  icon={Home} />
                  <Field label="Floor"    value={floor}                                       icon={Layers} />
                  <Field label="Line"     value={line}                                        icon={Layers} />
                  <Field label="View"     value={view ? cap(view) : null}                     icon={Eye} />
                </div>
              </Section>

              <Section title="Size & Capacity">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Sqft"        value={sqft ? `${sqft.toLocaleString()} sqft` : null} icon={Maximize2} />
                  <Field label="m²"          value={mt2  ? `${mt2} m²` : null}                     icon={Maximize2} />
                  <Field label="Capacity"    value={capacity ? `${capacity} guests` : null}         icon={Users} />
                  <Field label="Amenity Cap" value={amenityCap}                                     icon={Users} />
                </div>
              </Section>

              <Section title="Rooms">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Field label="Bedrooms"   value={bedrooms}                                      icon={BedDouble} />
                  <Field label="Bathrooms"  value={bathrooms ? `${bathrooms} bath` : null}        icon={Bath} />
                  <Field label="Bath Type"  value={bathType}                                       icon={Bath} />
                  <Field label="Total Beds" value={totalBeds}                                      icon={BedDouble} />
                </div>
              </Section>

              <Section title="Bed Configuration">
                {kings === 0 && queens === 0 && twins === 0 && !otherBeds ? (
                  <p className="text-sm text-muted-foreground">No bed configuration recorded</p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {kings > 0 && (
                      <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <p className="text-xl font-bold text-mvr-primary">{kings}</p>
                        <p className="text-xs text-muted-foreground">King{kings > 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {queens > 0 && (
                      <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <p className="text-xl font-bold text-mvr-primary">{queens}</p>
                        <p className="text-xs text-muted-foreground">Queen{queens > 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {twins > 0 && (
                      <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                        <p className="text-xl font-bold text-mvr-primary">{twins}</p>
                        <p className="text-xs text-muted-foreground">Twin{twins > 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {otherBeds && (() => {
                      const m = otherBeds.match(/^(\d+)\s+(.+)$/)
                      return (
                        <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                          {m ? (
                            <>
                              <p className="text-xl font-bold text-mvr-primary">{m[1]}</p>
                              <p className="text-xs text-muted-foreground">{m[2]}</p>
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground">{otherBeds}</p>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )}
              </Section>

              <Section title="Features & Amenities">
                {!hasKitchen && !hasBalcony && features.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No features recorded</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {hasKitchen && (
                      <span className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Kitchen</span>
                    )}
                    {hasBalcony && (
                      <span className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Balcony</span>
                    )}
                    {features.filter(f => f !== 'kitchen' && f !== 'balcony').map(f => (
                      <span key={f} className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border capitalize">
                        {f.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                )}
              </Section>

              {ownerNickname && (
                <Section title="Owner">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground shrink-0" />
                      {ownerId ? (
                        <Link href={`/data-master/owners/${ownerId}`} className="font-medium text-mvr-primary hover:underline">
                          {ownerNickname}
                        </Link>
                      ) : (
                        <span className="font-medium">{ownerNickname}</span>
                      )}
                    </div>
                    {ownerPhone && (
                      <a href={`tel:${ownerPhone}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                        <Phone className="w-4 h-4 shrink-0" />{ownerPhone}
                      </a>
                    )}
                    {ownerEmail && (
                      <a href={`mailto:${ownerEmail}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                        <Mail className="w-4 h-4 shrink-0" />{ownerEmail}
                      </a>
                    )}
                  </div>
                </Section>
              )}

              {notes && (
                <Section title="Notes">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </Section>
              )}

              <Section title="Record">
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label="Created"
                    value={new Date(createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    icon={Calendar}
                  />
                  <Field
                    label="Last updated"
                    value={new Date(updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    icon={Clock}
                  />
                </div>
              </Section>

            </div>
          )}

          {/* ── LISTINGS ── */}
          {tab === 'listings' && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Listings ({listingCount})</h2>
              </div>
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground p-5">No listings yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-mvr-cream border-b">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nickname</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Guesty ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0DBD4]">
                    {listings.map(l => (
                      <tr key={l.id} className="hover:bg-mvr-neutral/50 transition-colors">
                        <td className="px-4 py-2.5 font-medium">{l.name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{l.nickname ?? '—'}</td>
                        <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{l.guestyId ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ── CONTRACTS ── */}
          {tab === 'contracts' && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Contracts</h2>
              <p className="text-4xl font-bold text-mvr-primary">{contractCount}</p>
              <p className="text-sm text-muted-foreground">Owner contracts linked to this unit. Full contract management is available in the Contracts module.</p>
            </div>
          )}

          {/* ── INSPECTIONS ── */}
          {tab === 'inspections' && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Inspections</h2>
              <p className="text-4xl font-bold text-mvr-primary">{inspectionCount}</p>
              <p className="text-sm text-muted-foreground">Unit inspection records. Full inspection history and forms coming in a future module.</p>
            </div>
          )}

          {/* ── SCORE ── */}
          {tab === 'score' && (
            <div className="bg-white rounded-xl border p-5 space-y-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Score & Quality</h2>
              <div className="flex flex-wrap items-center gap-6">
                {scoreNum !== null ? (
                  <div className={[
                    'rounded-2xl px-8 py-5 text-center border',
                    scoreNum >= 8 ? 'bg-mvr-success-light border-mvr-success text-mvr-success' :
                    scoreNum >= 5 ? 'bg-mvr-warning-light border-mvr-warning text-mvr-warning' :
                                    'bg-mvr-danger-light border-mvr-danger text-mvr-danger',
                  ].join(' ')}>
                    <p className="text-5xl font-bold">{score}</p>
                    <p className="text-sm mt-1 opacity-70">Unit Score</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No score recorded</p>
                )}
                {photoQuality && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Photo Quality</p>
                    <span className={[
                      'text-sm px-3 py-1.5 rounded-full border font-medium',
                      photoQuality === 'pro'         ? 'bg-mvr-success-light text-mvr-success border-mvr-success' :
                      photoQuality === 'preliminary' ? 'bg-mvr-warning-light text-mvr-warning border-mvr-warning' :
                                                       'bg-mvr-neutral text-muted-foreground border-[#ccc]',
                    ].join(' ')}>
                      {photoQuality === 'pro' ? 'Pro' : photoQuality === 'preliminary' ? 'Preliminary' : 'Low Quality'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
