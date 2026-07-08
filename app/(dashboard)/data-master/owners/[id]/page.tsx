import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Pencil, Mail, Phone, MapPin, Globe, Link2, User, FileText, Building2 } from 'lucide-react'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import {
  DocumentsSection,
  type FolderView,
  type FileAlertView,
  type AlertTypeView,
} from '@/components/modules/data-master/DocumentsSection'

export const metadata: Metadata = { title: 'Owner Detail' }

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-mvr-success-light text-mvr-success',
  inactive: 'bg-mvr-danger-light text-mvr-danger',
  churned:  'bg-mvr-danger-light text-mvr-danger',
}

const UNIT_STATUS_STYLES: Record<string, string> = {
  active:      'bg-mvr-success-light text-mvr-success',
  onboarding:  'bg-mvr-warning-light text-mvr-warning',
  renovation:  'bg-mvr-steel-light text-muted-foreground',
  inactive:    'bg-mvr-neutral text-muted-foreground',
  off_board:   'bg-mvr-danger-light text-mvr-danger',
}

function fmtDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', year: 'numeric' })
}

function calcAge(dob: Date | null | undefined): number | null {
  if (!dob) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age >= 0 && age < 150 ? age : null
}

function formatAddress(o: { address: string | null; city: string | null; state: string | null; postalCode: string | null; country: string | null }): string | null {
  const parts = [o.address, [o.city, o.state].filter(Boolean).join(', '), o.postalCode, o.country].filter((p) => p && p.trim())
  return parts.length ? parts.join(', ') : null
}

// A compact 0–100 score bar for personality / communication style.
function ScoreBar({ label, leftLabel, rightLabel, value }: { label: string; leftLabel: string; rightLabel: string; value: number | null }) {
  if (value == null) return null
  return (
    <div className="py-2 border-b border-[#E0DBD4] last:border-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-xs font-semibold text-mvr-primary tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-mvr-neutral">
        <div className="h-1.5 rounded-full bg-mvr-primary" style={{ width: `${value}%` }} />
      </div>
      <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
        <span>{leftLabel}</span>
        <span>{rightLabel}</span>
      </div>
    </div>
  )
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

// Reusable card shell.
function Card({ title, icon: Icon, children, action }: {
  title: string
  icon?: React.ElementType
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border shadow-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

export default async function OwnerDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const editable = session ? await canEdit(session, 'data_master.owners') : false

  const [owner, alertTypes] = await Promise.all([
    db.owner.findUnique({
      where: { id: params.id },
      include: {
        units: {
          include: { building: { select: { id: true, name: true, nickname: true } } },
          orderBy: [{ buildingId: 'asc' }, { number: 'asc' }],
        },
        guestyOwners: {
          select: {
            id: true, guestyId: true, fullName: true, email: true, ownerType: true,
            listingCount: true, pictureUrl: true,
          },
          orderBy: { fullName: 'asc' },
        },
        documentFolders: { orderBy: { createdAt: 'asc' } },
        fileAlerts: {
          include: { alertType: true, folder: { select: { id: true, name: true } } },
          orderBy: { expirationDate: 'asc' },
        },
        _count: { select: { units: true, contracts: true, guestyOwners: true } },
      },
    }),
    db.alertType.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  if (!owner) notFound()

  const folders: FolderView[] = owner.documentFolders.map((f) => ({
    id: f.id, name: f.name, driveFolderId: f.driveFolderId,
  }))
  const alertTypeViews: AlertTypeView[] = alertTypes.map((t) => ({
    id: t.id, name: t.name, leadTimeDays: t.leadTimeDays, sendHour: t.sendHour,
    notifyInternal: t.notifyInternal, slackChannel: t.slackChannel, slackChannelId: t.slackChannelId,
    slackTemplate: t.slackTemplate, notifyOwner: t.notifyOwner, emailSubject: t.emailSubject, emailTemplate: t.emailTemplate,
  }))
  const fileAlerts: FileAlertView[] = owner.fileAlerts.map((a) => ({
    id: a.id,
    driveFileId: a.driveFileId,
    fileName: a.fileName,
    expirationDate: a.expirationDate.toISOString(),
    folderId: a.folderId,
    folderName: a.folder?.name ?? null,
    alertType: {
      id: a.alertType.id, name: a.alertType.name, leadTimeDays: a.alertType.leadTimeDays, sendHour: a.alertType.sendHour,
      notifyInternal: a.alertType.notifyInternal, slackChannel: a.alertType.slackChannel, slackChannelId: a.alertType.slackChannelId,
      slackTemplate: a.alertType.slackTemplate, notifyOwner: a.alertType.notifyOwner, emailSubject: a.alertType.emailSubject, emailTemplate: a.alertType.emailTemplate,
    },
  }))

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

      {/* Hero — full-width overview */}
      <div className="bg-white rounded-xl border shadow-card p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {owner.photoUrl ? (
              <img src={owner.photoUrl} alt={owner.nickname} className="w-16 h-16 rounded-full object-cover border-2 border-[#E0DBD4]" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-mvr-primary-light flex items-center justify-center border-2 border-[#E0DBD4]">
                <User className="w-7 h-7 text-mvr-primary" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-display font-bold text-mvr-primary">{owner.nickname}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[owner.status] ?? ''}`}>
                  {owner.status}
                </span>
                {owner.type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-mvr-primary-light text-mvr-primary capitalize">
                    {owner.type}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">
                Created {fmtDate(owner.createdAt)}
                {owner.status === 'inactive' && owner.inactivatedAt ? ` · Inactive since ${fmtDate(owner.inactivatedAt)}` : ''}
              </p>
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
        <div className="grid grid-cols-3 gap-4 mt-6 pt-5 border-t border-[#E0DBD4]">
          <div className="text-center">
            <p className="text-2xl font-bold text-mvr-primary">{owner._count.units}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Units</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mvr-primary">{owner._count.contracts}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Contracts</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-mvr-primary">{owner._count.guestyOwners}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Guesty accounts</p>
          </div>
        </div>
      </div>

      {/* Two-column body: LEFT = owner info (narrower) · RIGHT = documents (wider) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-5 items-start">
        {/* ── LEFT column ── */}
        <div className="space-y-5">
          {/* Contact */}
          <Card title="Contact">
            <InfoRow icon={Phone}  label="Phone"           value={owner.phone} href={owner.phone ? `tel:${owner.phone}` : undefined} />
            <InfoRow icon={Mail}   label="Primary Email"   value={owner.email} href={owner.email ? `mailto:${owner.email}` : undefined} />
            <InfoRow icon={Mail}   label="Secondary Email" value={owner.otherEmail} href={owner.otherEmail ? `mailto:${owner.otherEmail}` : undefined} />
            <InfoRow icon={MapPin} label="Address"         value={formatAddress(owner)} />
            {!owner.phone && !owner.email && !owner.address && (
              <p className="text-sm text-muted-foreground italic">No contact info recorded.</p>
            )}
          </Card>

          {/* Profile */}
          <Card title="Profile">
            <InfoRow icon={User}  label="Category"      value={owner.category} />
            <InfoRow icon={User}  label="Date of Birth" value={owner.dateOfBirth ? `${fmtDate(owner.dateOfBirth)}${calcAge(owner.dateOfBirth) != null ? ` · Age ${calcAge(owner.dateOfBirth)}` : ''}` : null} />
            <InfoRow icon={Globe} label="Nationality"   value={owner.nationality} />
            <InfoRow icon={Globe} label="Language"      value={owner.language?.toUpperCase()} />
            <ScoreBar label="Personality"         leftLabel="Easygoing" rightLabel="Needy"      value={owner.personalityScore} />
            <ScoreBar label="Communication Style" leftLabel="Low-touch" rightLabel="High-touch" value={owner.communicationScore} />
            {!owner.category && !owner.nationality && owner.personalityScore == null && owner.communicationScore == null && (
              <p className="text-sm text-muted-foreground italic">No profile info recorded.</p>
            )}
          </Card>

          {/* Identity */}
          {(owner.documentType || owner.documentNumber) && (
            <Card title="Identity">
              <InfoRow icon={FileText} label="Document Type"   value={owner.documentType} />
              <InfoRow icon={FileText} label="Document Number" value={owner.documentNumber} />
            </Card>
          )}

          {/* Links */}
          {(owner.linkedin || owner.siteUser) && (
            <Card title="Links">
              <InfoRow icon={Link2} label="LinkedIn"    value={owner.linkedin} href={owner.linkedin ?? undefined} />
              <InfoRow icon={User}  label="Portal User" value={owner.siteUser} />
            </Card>
          )}

          {/* Guesty Accounts */}
          <div className="bg-white rounded-xl border shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0DBD4] flex items-center justify-between">
              <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
                <Link2 className="w-4 h-4" />
                Guesty Accounts ({owner._count.guestyOwners})
              </h2>
              <Link href="/integrations/guesty" className="text-xs text-mvr-primary hover:underline">
                Manage
              </Link>
            </div>
            {owner.guestyOwners.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground italic">
                No Guesty accounts mapped to this owner yet.
              </div>
            ) : (
              <ul className="divide-y divide-[#E0DBD4]">
                {owner.guestyOwners.map((g) => (
                  <li key={g.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-mvr-neutral">
                      {g.pictureUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={g.pictureUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground/50" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{g.fullName || 'Unnamed owner'}</p>
                      {g.email && <p className="text-xs text-muted-foreground truncate">{g.email}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Units */}
          <div className="bg-white rounded-xl border shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E0DBD4] flex items-center justify-between">
              <h2 className="font-semibold text-mvr-primary text-sm uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Units ({owner._count.units})
              </h2>
              {owner._count.units > 0 && (
                <Link href={`/data-master/units`} className="text-xs text-mvr-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            {owner.units.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground italic">
                No units assigned to this owner yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-mvr-cream">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Unit</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Building</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E0DBD4]">
                    {owner.units.map((unit) => (
                      <tr key={unit.id} className="hover:bg-mvr-neutral/30 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/data-master/units/${unit.id}`} className="font-medium text-mvr-primary hover:underline">
                            {unit.number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          <Link href={`/data-master/buildings/${unit.building.id}`} className="hover:text-mvr-primary transition-colors">
                            {unit.building.name}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${UNIT_STATUS_STYLES[unit.status] ?? 'bg-mvr-neutral text-muted-foreground'}`}>
                            {unit.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          {owner.notes && (
            <Card title="Notes">
              <p className="text-sm text-foreground whitespace-pre-wrap">{owner.notes}</p>
            </Card>
          )}
        </div>

        {/* ── RIGHT column: documents ── */}
        <div className="space-y-5">
          <DocumentsSection
            target={{ ownerId: owner.id }}
            folders={folders}
            fileAlerts={fileAlerts}
            alertTypes={alertTypeViews}
            canEdit={editable}
          />
        </div>
      </div>
    </div>
  )
}
