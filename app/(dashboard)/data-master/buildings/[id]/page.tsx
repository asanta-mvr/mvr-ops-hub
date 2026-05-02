import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Pencil, MapPin, Building2, ExternalLink, Globe, FolderOpen } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import ContactTabsPanel from '@/components/modules/data-master/ContactTabsPanel'
import HouseRulesPanel from '@/components/modules/data-master/HouseRulesPanel'
import PhotoGallery from '@/components/modules/data-master/PhotoGallery'
import { getSignedImageUrl } from '@/lib/storage/gcs'

export const metadata: Metadata = { title: 'Building Detail' }

const statusStyles: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
}

const unitStatusStyles: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888]',
  renovation: 'bg-blue-50 text-blue-600',
}

export default async function BuildingDetailPage({ params }: { params: { id: string } }) {
  const building = await db.building.findUnique({
    where: { id: params.id },
    include: {
      city: { include: { state: { include: { country: true } } } },
      units: { orderBy: { number: 'asc' } },
      propertyManagers: { orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }] },
      _count: { select: { units: true, contracts: true } },
    },
  })

  if (!building) notFound()

  const ownerCount = new Set(building.units.map((u) => u.ownerUniqueId).filter(Boolean)).size

  // Resolve all photo URLs (Drive thumbnails + GCS signed URLs)
  const buildingPhotos = (building as unknown as { photos: string[] }).photos ?? []
  const allPhotoSources = buildingPhotos.length > 0
    ? buildingPhotos
    : building.imageUrl ? [building.imageUrl] : []

  const [imageUrl, ...extraPhotos] = await Promise.all(
    allPhotoSources.map((p) => getSignedImageUrl(p))
  )
  const galleryUrls = [imageUrl, ...extraPhotos].filter((u): u is string => !!u)

  const driveUrl = building.floorplanUrls[0] ?? null

  const stats = [
    { label: 'Total Units',  value: building._count.units },
    { label: 'Active Units', value: building.units.filter((u) => u.status === 'active').length },
    { label: 'Contracts',    value: building._count.contracts },
    { label: 'Owners',       value: ownerCount },
  ]

  return (
    <div className="space-y-5">
      {/* Page breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/data-master/buildings" className="hover:text-mvr-primary">Buildings</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">{building.name}</span>
      </nav>

      {/* Two-column layout — starts at the very top */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── LEFT column (2/3) ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Hero card — shorter than before */}
          <div className="bg-white rounded-2xl border overflow-hidden shadow-card">
            {imageUrl ? (
              <div className="h-44 md:h-52 w-full relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={building.name}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[building.status] ?? statusStyles.inactive}`}>
                        {building.status}
                      </span>
                      {building.zone && (
                        <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                          {building.zone}
                        </span>
                      )}
                    </div>
                    <h1 className="font-display text-2xl font-bold text-white drop-shadow">{building.name}</h1>
                    {building.nickname && (
                      <p className="text-white/70 text-sm mt-0.5">{building.nickname}</p>
                    )}
                  </div>
                  <Link href={`/data-master/buildings/${params.id}/edit`}>
                    <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="h-24 bg-mvr-primary/8 flex items-center justify-between px-5">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[building.status] ?? statusStyles.inactive}`}>
                      {building.status}
                    </span>
                  </div>
                  <h1 className="font-display text-xl font-bold text-mvr-primary">{building.name}</h1>
                  {building.nickname && (
                    <p className="text-muted-foreground text-sm">{building.nickname}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-10 h-10 text-mvr-primary/20" />
                  <Link href={`/data-master/buildings/${params.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Address / links bar */}
            <div className="px-5 py-2.5 border-t border-[#E0DBD4] flex items-center justify-between flex-wrap gap-2">
              <div className="flex flex-col gap-0.5">
                {building.address && (
                  <p className="text-muted-foreground text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {building.address}{building.zipcode ? `, ${building.zipcode}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {building.googleUrl && (
                  <a href={building.googleUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-mvr-primary hover:underline flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Maps <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
                {building.website && (
                  <a href={building.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-mvr-primary hover:underline flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Website <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Stats — compact inline row */}
          <div className="grid grid-cols-4 gap-3">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border px-3 py-3 text-center">
                <p className="text-xl font-bold text-mvr-primary">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Units table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
                Units ({building.units.length})
              </h2>
              <Link href={`/data-master/units?buildingId=${params.id}`} className="text-xs text-mvr-primary hover:underline">
                View all
              </Link>
            </div>
            {building.units.length === 0 ? (
              <p className="text-sm text-muted-foreground p-5">No units yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-mvr-neutral border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Unit</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Beds</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {building.units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-mvr-neutral/50 transition-colors">
                      <td className="px-4 py-2.5 font-medium">{unit.number}</td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">
                        {unit.type?.replace('_', ' ') ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{unit.bedrooms ?? '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${unitStatusStyles[unit.status] ?? unitStatusStyles.inactive}`}>
                          {unit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Photo gallery */}
          {galleryUrls.length > 0 && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
                  Photos ({galleryUrls.length})
                </h2>
                <Link href={`/data-master/buildings/${params.id}/edit`} className="text-xs text-mvr-primary hover:underline">
                  Edit
                </Link>
              </div>
              <PhotoGallery urls={galleryUrls} />
            </div>
          )}

          {/* Amenities */}
          {building.amenities.length > 0 && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {building.amenities.map((a) => (
                  <span key={a} className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT column (1/3) — starts at top, aligned with hero ── */}
        <div className="space-y-4">

          {/* Property Managers + Front Desk */}
          <ContactTabsPanel
            buildingId={params.id}
            initialManagers={building.propertyManagers}
            frontdeskPhone={building.frontdeskPhone ?? null}
            frontdeskEmail={building.frontdeskEmail ?? null}
            frontdeskHours={(building as unknown as { frontdeskHours: string | null }).frontdeskHours ?? null}
            checkinHours={building.checkinHours ?? null}
            checkoutHours={building.checkoutHours ?? null}
          />

          {/* Rules & Knowledge Base */}
          <HouseRulesPanel
            buildingId={building.id}
            buildingName={building.name}
            knowledgeBase={building.knowledgeBase ?? null}
          />

          {/* Google Drive documents folder */}
          {driveUrl && (
            <div className="bg-white rounded-xl border p-4">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary mb-3">Documents</h2>
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-[#E0DBD4] hover:bg-mvr-neutral/50 transition-colors group"
              >
                <FolderOpen className="w-4 h-4 text-mvr-sand shrink-0" />
                <span className="text-sm text-mvr-primary font-medium flex-1 truncate">Building Documents</span>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-mvr-primary transition-colors shrink-0" />
              </a>
              <p className="text-[11px] text-muted-foreground mt-2">Floorplans, contracts, and building documents on Google Drive.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
