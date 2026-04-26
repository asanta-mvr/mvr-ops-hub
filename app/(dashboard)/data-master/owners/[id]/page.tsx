import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Mail, Phone, MapPin, Globe, Link2, User, FileText, Building2, Star } from 'lucide-react'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Owner Detail' }

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-mvr-success-light text-mvr-success',
  inactive: 'bg-mvr-neutral text-muted-foreground',
  churned:  'bg-mvr-danger-light text-mvr-danger',
}

const UNIT_STATUS_STYLES: Record<string, string> = {
  active:      'bg-mvr-success-light text-mvr-success',
  onboarding:  'bg-mvr-warning-light text-mvr-warning',
  renovation:  'bg-mvr-steel-light text-muted-foreground',
  inactive:    'bg-mvr-neutral text-muted-foreground',
  off_board:   'bg-mvr-danger-light text-mvr-danger',
}

function InfoRow({ icon: Icon, label, value, href }: {
  icon: React.ElementType
  label: string
  value: string | null | undefined
  href?: string
}) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[#E0DBD4] last:border-0">
      <div className="mt-0.5 p-1.5 bg-mvr-primary-light rounded-md shrink-0">
        <Icon className="w-3.5 h-3.5 text-mvr-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-mvr-primary hover:underline break-all">
            {value}
          </a>
        ) : (
          <p className="text-sm font-medium text-foreground break-all">{value}</p>
        )}
      </div>
    </div>
  )
}

export default async function OwnerDetailPage({ params }: { params: { id: string } }) {
  const owner = await db.owner.findUnique({
    where: { id: params.id },
    include: {
      units: {
        include: { building: { select: { id: true, name: true, nickname: true } } },
        orderBy: [{ buildingId: 'asc' }, { number: 'asc' }],
      },
      _count: { select: { units: true, contracts: true } },
    },
  })

  if (!owner) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-xs text-muted-foreground flex items-center gap-1">
        <Link href="/data-master" className="hover:text-mvr-primary transition-colors">Data Master</Link>
        <span>/</span>
        <Link href="/data-master/owners" className="hover:text-mvr-primary transition-colors">Owners</Link>
        <span>/</span>
        <span className="truncate max-w-[200px]">{owner.nickname}</span>
      </nav>

      {/* Hero */}
      <div className="bg-white rounded-xl border shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {owner.photoUrl ? (
              <img
                src={owner.photoUrl}
                alt={owner.nickname}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#E0DBD4]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-mvr-primary-light flex items-center justify-center border-2 border-[#E0DBD4]">
                <User className="w-7 h-7 text-mvr-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-display font-bold text-mvr-primary">{owner.nickname}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-mono text-muted-foreground">{owner.uniqueId}</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[owner.status] ?? ''}`}>
                  {owner.status}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mvr-primary-light text-mvr-primary capitalize">
                  {owner.type}
                </span>
              </div>
            </div>
          </div>
          <Link
            href={`/data-master/owners/${owner.id}/edit`}
            className="flex items-center gap-2 px-4 py-2 bg-mvr-primary text-white text-sm font-medium rounded-lg hover:bg-mvr-primary/90 transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Owner
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#E0DBD4]">
          <div className="text-center">
            <p className="text-2xl font-bold text-mvr-primary">{owner._count.units}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Units</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mvr-primary">{owner._count.contracts}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contracts</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-mvr-primary">{owner.nationality ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Nationality</p>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Contact */}
        <div className="bg-white rounded-xl border shadow-card p-5">
          <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide mb-3">Contact</h2>
          <InfoRow icon={Phone}  label="Phone"           value={owner.phone} href={owner.phone ? `tel:${owner.phone}` : undefined} />
          <InfoRow icon={Mail}   label="Primary Email"   value={owner.email} href={owner.email ? `mailto:${owner.email}` : undefined} />
          <InfoRow icon={Mail}   label="Secondary Email" value={owner.otherEmail} href={owner.otherEmail ? `mailto:${owner.otherEmail}` : undefined} />
          <InfoRow icon={MapPin} label="Address"         value={owner.address} />
          {!owner.phone && !owner.email && !owner.address && (
            <p className="text-sm text-muted-foreground italic">No contact info recorded.</p>
          )}
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border shadow-card p-5">
          <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide mb-3">Profile</h2>
          <InfoRow icon={User}     label="Age"          value={owner.age ? String(owner.age) : null} />
          <InfoRow icon={Globe}    label="Nationality"  value={owner.nationality} />
          <InfoRow icon={Globe}    label="Language"     value={owner.language?.toUpperCase()} />
          <InfoRow icon={Link2}    label="LinkedIn"     value={owner.linkedin} href={owner.linkedin ?? undefined} />
          <InfoRow icon={User}     label="Portal User"  value={owner.siteUser} />
          <InfoRow icon={User}     label="Category"     value={owner.category} />
          <InfoRow icon={User}     label="Personality"  value={owner.personality} />
          {!owner.nationality && !owner.linkedin && !owner.siteUser && (
            <p className="text-sm text-muted-foreground italic">No profile info recorded.</p>
          )}
        </div>

        {/* Documents */}
        {(owner.documentType || owner.documentNumber) && (
          <div className="bg-white rounded-xl border shadow-card p-5">
            <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide mb-3">Documents</h2>
            <InfoRow icon={FileText} label="Document Type"   value={owner.documentType} />
            <InfoRow icon={FileText} label="Document Number" value={owner.documentNumber} />
          </div>
        )}

        {/* Notes */}
        {owner.notes && (
          <div className="bg-white rounded-xl border shadow-card p-5">
            <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide mb-3">Notes</h2>
            <p className="text-sm text-foreground whitespace-pre-wrap">{owner.notes}</p>
          </div>
        )}
      </div>

      {/* Associated Units */}
      <div className="bg-white rounded-xl border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E0DBD4] flex items-center justify-between">
          <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Units ({owner._count.units})
          </h2>
          {owner._count.units > 0 && (
            <Link
              href={`/data-master/units`}
              className="text-xs text-mvr-primary hover:underline"
            >
              View all units
            </Link>
          )}
        </div>
        {owner.units.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground italic">
            No units assigned to this owner yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-mvr-cream">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Building</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">View</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DBD4]">
              {owner.units.map((unit) => (
                <tr key={unit.id} className="hover:bg-mvr-neutral/30 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/data-master/units/${unit.id}`}
                      className="font-medium text-mvr-primary hover:underline"
                    >
                      {unit.number}
                    </Link>
                    {unit.floor && (
                      <p className="text-xs text-muted-foreground">Floor {unit.floor}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <Link href={`/data-master/buildings/${unit.building.id}`} className="hover:text-mvr-primary transition-colors">
                      {unit.building.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground capitalize">
                    {unit.view ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${UNIT_STATUS_STYLES[unit.status] ?? 'bg-mvr-neutral text-muted-foreground'}`}>
                      {unit.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {unit.score ? (
                      <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                        <Star className="w-3.5 h-3.5 text-amber-400" />
                        {String(unit.score)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
