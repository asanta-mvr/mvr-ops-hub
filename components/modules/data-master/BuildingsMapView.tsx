'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  MapPin, Phone, Mail, Clock, Globe, ExternalLink,
  Pencil, X, Building2, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BuildingMapItem } from './BuildingsMap'

// MapLibre/WebGL must be loaded client-side only
const BuildingsMap = dynamic(() => import('./BuildingsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full rounded-xl bg-mvr-neutral animate-pulse flex items-center justify-center">
      <p className="text-sm text-muted-foreground">Loading map…</p>
    </div>
  ),
})

export interface BuildingFull extends BuildingMapItem {
  address:         string | null
  zipcode:         string | null
  googleUrl:       string | null
  website:         string | null
  imageUrl:        string | null
  frontdeskPhone:  string | null
  frontdeskEmail:  string | null
  checkinHours:    string | null
  checkoutHours:   string | null
  amenities:       string[]
  unitCount:       number
  keyCount:        number
  ownerCount:      number
  createdAt:       string
  city?: { name: string; state?: { isoCode: string | null } | null } | null
}

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  )
}

function BuildingPanel({ building, onClose }: { building: BuildingFull; onClose: () => void }) {
  const location = [building.address, building.zipcode].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border overflow-hidden">
      {/* Photo / header */}
      <div className="relative shrink-0">
        {building.imageUrl ? (
          <div
            className="h-36 bg-cover bg-center"
            style={{ backgroundImage: `url(${building.imageUrl})` }}
          />
        ) : (
          <div className="h-36 bg-mvr-primary/10 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-mvr-primary/30" />
          </div>
        )}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-1 shadow transition-colors"
        >
          <X className="w-4 h-4 text-foreground" />
        </button>
        <span
          className={`absolute bottom-2 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
            STATUS_STYLES[building.status] ?? STATUS_STYLES.inactive
          }`}
        >
          {building.status}
        </span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Name */}
        <div>
          <h3 className="text-lg font-bold text-mvr-primary leading-tight">{building.name}</h3>
          {building.nickname && (
            <p className="text-xs text-muted-foreground mt-0.5">{building.nickname}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-mvr-neutral rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-mvr-primary">
              {building.unitCount} / {building.keyCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Units / Keys</p>
          </div>
          <div className="bg-mvr-neutral rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-mvr-primary">{building.ownerCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Owners</p>
          </div>
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Location</p>
          {location && (
            <Row icon={<MapPin className="w-3.5 h-3.5" />}>{location}</Row>
          )}
          {building.zone && (
            <p className="text-xs text-muted-foreground pl-5">{building.zone}</p>
          )}
          {building.googleUrl && (
            <a
              href={building.googleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-mvr-primary hover:underline"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Open in Google Maps
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {building.website && (
            <a
              href={building.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-mvr-primary hover:underline"
            >
              <Globe className="w-3.5 h-3.5 shrink-0" />
              {building.website.replace(/^https?:\/\//, '')}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Front desk */}
        {(building.frontdeskPhone || building.frontdeskEmail || building.checkinHours) && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Front Desk</p>
            {building.frontdeskPhone && (
              <a href={`tel:${building.frontdeskPhone}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                <Phone className="w-3.5 h-3.5 shrink-0" />
                {building.frontdeskPhone}
              </a>
            )}
            {building.frontdeskEmail && (
              <a href={`mailto:${building.frontdeskEmail}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                <Mail className="w-3.5 h-3.5 shrink-0" />
                {building.frontdeskEmail}
              </a>
            )}
            {building.checkinHours && (
              <Row icon={<Clock className="w-3.5 h-3.5" />}>
                Check-in: {building.checkinHours}
              </Row>
            )}
            {building.checkoutHours && (
              <Row icon={<Clock className="w-3.5 h-3.5" />}>
                Check-out: {building.checkoutHours}
              </Row>
            )}
          </div>
        )}

        {/* Amenities */}
        {building.amenities.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-mvr-primary">Amenities</p>
            <div className="flex flex-wrap gap-1.5">
              {building.amenities.map((a) => (
                <span
                  key={a}
                  className="px-2 py-0.5 bg-mvr-neutral rounded-full text-xs text-muted-foreground border"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 border-t p-3 flex gap-2">
        <Link href={`/data-master/buildings/${building.id}/edit`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        </Link>
        <Link href={`/data-master/buildings/${building.id}`} className="flex-1">
          <Button size="sm" className="w-full bg-mvr-primary hover:bg-mvr-primary/90">
            Full Details
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default function BuildingsMapView({ buildings }: { buildings: BuildingFull[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedBuilding = buildings.find((b) => b.id === selectedId) ?? null

  return (
    <div className="space-y-4">
      {/* Map + Panel */}
      <div className="flex gap-4 h-[520px]">
        {/* Map */}
        <div className={`transition-all duration-300 ${selectedBuilding ? 'flex-1' : 'w-full'}`}>
          <BuildingsMap
            buildings={buildings}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        {/* Side panel */}
        {selectedBuilding && (
          <div className="w-72 shrink-0">
            <BuildingPanel
              building={selectedBuilding}
              onClose={() => setSelectedId(null)}
            />
          </div>
        )}
      </div>

      {/* Buildings list below map */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-5 py-3 border-b bg-mvr-neutral">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {buildings.length} Buildings
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Zone</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Units / Keys</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Owners</th>
              <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {buildings.map((b) => (
              <tr
                key={b.id}
                onClick={() => setSelectedId(b.id === selectedId ? null : b.id)}
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
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_STYLES[b.status] ?? STATUS_STYLES.inactive
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  <span className="font-medium text-foreground">{b.unitCount}</span>
                  <span className="text-muted-foreground"> / {b.keyCount}</span>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{b.ownerCount}</td>
                <td className="px-4 py-2.5 text-muted-foreground text-xs">{b.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
