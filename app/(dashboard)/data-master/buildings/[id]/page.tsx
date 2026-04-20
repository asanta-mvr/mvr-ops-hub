import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Pencil, MapPin, Phone, Mail, Clock, Building2, ExternalLink, Globe } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import PropertyManagersPanel from '@/components/modules/data-master/PropertyManagersPanel'

const GCS_BASE = 'https://storage.googleapis.com/mvr-ops-hub-assets'

function resolveImageUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${GCS_BASE}/${url}`
}

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

  const emergencyContacts = Array.isArray(building.emergencyContacts)
    ? (building.emergencyContacts as { name: string; phone: string; role: string }[])
    : []

  const imageUrl = resolveImageUrl(building.imageUrl)

  return (
    <div className="space-y-6">
      {/* Hero image + header */}
      <div className="bg-white rounded-2xl border overflow-hidden shadow-card">
        {/* Hero image */}
        {imageUrl ? (
          <div
            className="h-56 md:h-72 w-full bg-cover bg-center relative"
            style={{ backgroundImage: `url(${imageUrl})` }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-5 right-5 flex items-end justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      statusStyles[building.status] ?? statusStyles.inactive
                    }`}
                  >
                    {building.status}
                  </span>
                  {building.zone && (
                    <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {building.zone}
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-white drop-shadow">
                  {building.name}
                </h1>
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
          <div className="h-32 bg-mvr-primary/8 flex items-center justify-between px-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    statusStyles[building.status] ?? statusStyles.inactive
                  }`}
                >
                  {building.status}
                </span>
              </div>
              <h1 className="font-display text-2xl font-bold text-mvr-primary">{building.name}</h1>
              {building.nickname && (
                <p className="text-muted-foreground text-sm">{building.nickname}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Building2 className="w-12 h-12 text-mvr-primary/20" />
              <Link href={`/data-master/buildings/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Address bar */}
        <div className="px-5 py-3 border-t border-[#E0DBD4] flex items-center justify-between flex-wrap gap-3">
          <nav className="flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/data-master/buildings" className="hover:text-mvr-primary">Buildings</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground">{building.name}</span>
          </nav>
          {building.address && (
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {building.address}{building.zipcode ? `, ${building.zipcode}` : ''}
            </p>
          )}
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

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Units', value: building._count.units },
          { label: 'Active Units', value: building.units.filter((u) => u.status === 'active').length },
          { label: 'Contracts', value: building._count.contracts },
          { label: 'Zone', value: building.zone ?? '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold text-mvr-primary">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Contact & Hours */}
          <div className="bg-white rounded-xl border p-5 space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Front Desk</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {building.frontdeskPhone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a href={`tel:${building.frontdeskPhone}`} className="hover:text-mvr-primary">
                    {building.frontdeskPhone}
                  </a>
                </div>
              )}
              {building.frontdeskEmail && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <a href={`mailto:${building.frontdeskEmail}`} className="hover:text-mvr-primary">
                    {building.frontdeskEmail}
                  </a>
                </div>
              )}
              {building.checkinHours && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Check-in: {building.checkinHours}</span>
                </div>
              )}
              {building.checkoutHours && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Check-out: {building.checkoutHours}</span>
                </div>
              )}
              {!building.frontdeskPhone && !building.frontdeskEmail && !building.checkinHours && (
                <p className="text-muted-foreground col-span-2">No contact info yet.</p>
              )}
            </div>
          </div>

          {/* Units */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
                Units ({building.units.length})
              </h2>
              <Link
                href={`/data-master/units?buildingId=${params.id}`}
                className="text-xs text-mvr-primary hover:underline"
              >
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
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            unitStatusStyles[unit.status] ?? unitStatusStyles.inactive
                          }`}
                        >
                          {unit.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Amenities */}
          {building.amenities.length > 0 && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {building.amenities.map((a) => (
                  <span
                    key={a}
                    className="px-3 py-1 bg-mvr-neutral rounded-full text-xs text-muted-foreground border"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-5">
            {/* Property Managers — interactive panel */}
          <PropertyManagersPanel
            buildingId={params.id}
            initialManagers={building.propertyManagers}
          />

          {/* Emergency Contacts */}
          {emergencyContacts.length > 0 && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">
                Emergency Contacts
              </h2>
              <div className="space-y-3">
                {emergencyContacts.map((contact, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{contact.name}</p>
                    <p className="text-muted-foreground text-xs">{contact.role}</p>
                    <a href={`tel:${contact.phone}`} className="text-xs text-mvr-primary hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rules */}
          {building.rules && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <h2 className="font-semibold text-sm uppercase tracking-wide text-mvr-primary">House Rules</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{building.rules}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
