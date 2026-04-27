import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight, Pencil, Home, BedDouble, Bath,
  ExternalLink, User, Phone, Mail,
} from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { TYPE_LABELS } from '@/lib/constants/units'
import PhotoGallery from '@/components/modules/data-master/PhotoGallery'

export const metadata: Metadata = { title: 'Unit Detail' }

const GCS_BASE = 'https://storage.googleapis.com/mvr-ops-hub-assets'

function resolveImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${GCS_BASE}/${url}`
}

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
  renovation: 'bg-blue-50 text-blue-600 border-blue-200',
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default async function UnitDetailPage({ params }: { params: { id: string } }) {
  const unit = await db.unit.findUnique({
    where: { id: params.id },
    include: {
      building: { select: { id: true, name: true, nickname: true } },
      owner:    { select: { uniqueId: true, nickname: true, phone: true, email: true } },
      listings: { orderBy: { name: 'asc' } },
      _count:   { select: { listings: true, contracts: true, inspections: true } },
    },
  })

  if (!unit) notFound()

  const heroUrl = resolveImageUrl(unit.photoUrls[0])

  return (
    <div className="space-y-6">
      {/* Hero + header */}
      <div className="bg-white rounded-2xl border overflow-hidden shadow-card">
        {heroUrl ? (
          <div
            className="h-56 md:h-72 w-full bg-cover bg-center relative"
            style={{ backgroundImage: `url(${heroUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive}`}>
                    {capitalize(unit.status)}
                  </span>
                  {unit.type && (
                    <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {TYPE_LABELS[unit.type] ?? unit.type}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white drop-shadow">
                  Unit {unit.number}
                </h1>
                <p className="text-white/70 text-sm mt-0.5">{unit.building.name}</p>
              </div>
              <Link href={`/data-master/units/${params.id}/edit`}>
                <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="h-32 bg-mvr-primary/8 flex items-center justify-between px-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive}`}>
                  {capitalize(unit.status)}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-mvr-primary">Unit {unit.number}</h1>
              <p className="text-muted-foreground text-sm">{unit.building.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <Home className="w-12 h-12 text-mvr-primary/20" />
              <Link href={`/data-master/units/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Breadcrumb bar */}
        <div className="px-5 py-3 border-t border-[#E0DBD4]">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/data-master/units" className="hover:text-mvr-primary">Units</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/data-master/buildings/${unit.building.id}`} className="hover:text-mvr-primary">
              {unit.building.name}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">Unit {unit.number}</span>
          </nav>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Listings',    value: unit._count.listings },
          { label: 'Contracts',   value: unit._count.contracts },
          { label: 'Inspections', value: unit._count.inspections },
          { label: 'Score',       value: unit.score ? String(unit.score) : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-mvr-primary">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: specs + beds + photos */}
        <div className="lg:col-span-2 space-y-5">
          {/* Specs */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Specs</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-6 text-sm">
              {unit.type && (
                <div>
                  <p className="text-xs text-muted-foreground">Type</p>
                  <p className="font-medium">{TYPE_LABELS[unit.type] ?? unit.type}</p>
                </div>
              )}
              {unit.floor != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Floor</p>
                  <p className="font-medium">{unit.floor}{unit.line ? ` · Line ${unit.line}` : ''}</p>
                </div>
              )}
              {unit.view && (
                <div>
                  <p className="text-xs text-muted-foreground">View</p>
                  <p className="font-medium">{unit.view}</p>
                </div>
              )}
              {unit.sqft && (
                <div>
                  <p className="text-xs text-muted-foreground">Sqft</p>
                  <p className="font-medium">{unit.sqft.toLocaleString()} sqft</p>
                </div>
              )}
              {unit.mt2 && (
                <div>
                  <p className="text-xs text-muted-foreground">m²</p>
                  <p className="font-medium">{String(unit.mt2)} m²</p>
                </div>
              )}
              {unit.capacity != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Capacity</p>
                  <p className="font-medium">{unit.capacity} guests</p>
                </div>
              )}
              {unit.bedrooms != null && (
                <div>
                  <p className="text-xs text-muted-foreground">Bedrooms</p>
                  <p className="font-medium flex items-center gap-1">
                    <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
                    {unit.bedrooms}
                  </p>
                </div>
              )}
              {unit.bathrooms && (
                <div>
                  <p className="text-xs text-muted-foreground">Bathrooms</p>
                  <p className="font-medium flex items-center gap-1">
                    <Bath className="w-3.5 h-3.5 text-muted-foreground" />
                    {String(unit.bathrooms)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Bed config */}
          {(unit.kings > 0 || unit.queens > 0 || unit.twins > 0 || unit.otherBeds) && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Bed Configuration</h2>
              <div className="flex flex-wrap gap-3">
                {unit.kings  > 0 && (
                  <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                    <p className="text-lg font-bold text-mvr-primary">{unit.kings}</p>
                    <p className="text-xs text-muted-foreground">King{unit.kings > 1 ? 's' : ''}</p>
                  </div>
                )}
                {unit.queens > 0 && (
                  <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                    <p className="text-lg font-bold text-mvr-primary">{unit.queens}</p>
                    <p className="text-xs text-muted-foreground">Queen{unit.queens > 1 ? 's' : ''}</p>
                  </div>
                )}
                {unit.twins  > 0 && (
                  <div className="bg-mvr-neutral rounded-lg px-4 py-3 text-center min-w-[80px]">
                    <p className="text-lg font-bold text-mvr-primary">{unit.twins}</p>
                    <p className="text-xs text-muted-foreground">Twin{unit.twins > 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>
              {unit.otherBeds && (
                <p className="text-sm text-muted-foreground">{unit.otherBeds}</p>
              )}
            </div>
          )}

          {/* Listings */}
          {unit.listings.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
                  Listings ({unit.listings.length})
                </h2>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-mvr-neutral border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Name</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Nickname</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Guesty ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {unit.listings.map((l) => (
                    <tr key={l.id} className="hover:bg-mvr-neutral/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{l.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">{l.nickname ?? '—'}</td>
                      <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{l.guestyId ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Photo gallery */}
          {unit.photoUrls.length > 0 && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Photos</h2>
                {unit.photoQuality && (
                  <span className={[
                    'text-xs px-2 py-0.5 rounded-full border font-medium',
                    unit.photoQuality === 'pro'
                      ? 'bg-mvr-success-light text-mvr-success border-mvr-success'
                      : unit.photoQuality === 'preliminary'
                      ? 'bg-mvr-warning-light text-mvr-warning border-mvr-warning'
                      : 'bg-mvr-neutral text-muted-foreground border-[#ccc]',
                  ].join(' ')}>
                    {unit.photoQuality === 'pro' ? 'Pro' : unit.photoQuality === 'preliminary' ? 'Preliminary' : 'Low Quality'}
                  </span>
                )}
              </div>
              <PhotoGallery
                urls={unit.photoUrls.map(u => resolveImageUrl(u)).filter((u): u is string => !!u)}
              />
            </div>
          )}
        </div>

        {/* Right: owner + features + notes */}
        <div className="space-y-5">
          {/* Features */}
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Features</h2>
            <div className="flex flex-wrap gap-2">
              {unit.hasKitchen && (
                <span className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Kitchen</span>
              )}
              {unit.hasBalcony && (
                <span className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">Balcony</span>
              )}
              {unit.features.map(f => (
                <span key={f} className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border capitalize">
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
              {!unit.hasKitchen && !unit.hasBalcony && unit.features.length === 0 && (
                <p className="text-sm text-muted-foreground">No features recorded</p>
              )}
            </div>
          </div>

          {/* Google Drive folder */}
          {unit.driveFolderUrl && (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary mb-2">Drive Folder</h2>
              <a
                href={unit.driveFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-mvr-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open unit folder
              </a>
            </div>
          )}

          {/* Owner */}
          {unit.owner ? (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Owner</h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="font-medium">{unit.owner.nickname}</span>
                </div>
                {unit.owner.phone && (
                  <a href={`tel:${unit.owner.phone}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                    <Phone className="w-4 h-4 shrink-0" />
                    {unit.owner.phone}
                  </a>
                )}
                {unit.owner.email && (
                  <a href={`mailto:${unit.owner.email}`} className="flex items-center gap-2 text-sm text-mvr-primary hover:underline">
                    <Mail className="w-4 h-4 shrink-0" />
                    {unit.owner.email}
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border p-5">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary mb-2">Owner</h2>
              <p className="text-sm text-muted-foreground">No owner assigned</p>
            </div>
          )}

          {/* Notes */}
          {unit.notes && (
            <div className="bg-white rounded-xl border p-5 space-y-2">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{unit.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
