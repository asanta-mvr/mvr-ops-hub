import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Pencil } from 'lucide-react'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { Button } from '@/components/ui/button'
import { UnitDetailTabs } from '@/components/modules/data-master/UnitDetailTabs'
import type {
  FolderView,
  FileAlertView,
  AlertTypeView,
} from '@/components/modules/data-master/DocumentsSection'

export const metadata: Metadata = { title: 'Unit Detail' }

const STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
  renovation: 'bg-blue-50 text-blue-600 border-blue-200',
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1) }

export default async function UnitDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  const docCanEdit = session ? await canEdit(session, 'data_master.owners') : false

  const [unit, alertTypes] = await Promise.all([
    db.unit.findUnique({
      where: { id: params.id },
      include: {
        building: { select: { id: true, name: true } },
        owner:    { select: { id: true, nickname: true, phone: true, email: true } },
        listings: { orderBy: { name: 'asc' }, select: { id: true, name: true, nickname: true, guestyId: true } },
        documentFolders: { orderBy: { createdAt: 'asc' } },
        fileAlerts: {
          include: { alertType: true, folder: { select: { id: true, name: true } } },
          orderBy: { expirationDate: 'asc' },
        },
        _count:   { select: { listings: true, contracts: true, inspections: true } },
      },
    }),
    db.alertType.findMany({ orderBy: { createdAt: 'asc' } }),
  ])

  if (!unit) notFound()

  const folders: FolderView[] = unit.documentFolders.map((f) => ({
    id: f.id, name: f.name, driveFolderId: f.driveFolderId,
  }))
  const alertTypeViews: AlertTypeView[] = alertTypes.map((t) => ({
    id: t.id, name: t.name, leadTimeDays: t.leadTimeDays, sendHour: t.sendHour,
    notifyInternal: t.notifyInternal, slackChannel: t.slackChannel, slackChannelId: t.slackChannelId,
    slackTemplate: t.slackTemplate, notifyOwner: t.notifyOwner, emailSubject: t.emailSubject, emailTemplate: t.emailTemplate,
  }))
  const fileAlerts: FileAlertView[] = unit.fileAlerts.map((a) => ({
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
    <div className="space-y-4">
      {/* Compact header */}
      <div className="bg-white rounded-2xl border shadow-card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-1.5">
              <Link href="/data-master/units" className="hover:text-mvr-primary">Units</Link>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/data-master/buildings/${unit.building.id}`} className="hover:text-mvr-primary">
                {unit.building.name}
              </Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground">Unit {unit.number}</span>
            </nav>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-bold text-mvr-primary">Unit {unit.number}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[unit.status] ?? STATUS_STYLES.inactive}`}>
                {cap(unit.status)}
              </span>
              <span className="text-sm text-muted-foreground">{unit.building.name}</span>
            </div>
          </div>
          <Link href={`/data-master/units/${params.id}/edit`} className="shrink-0">
            <Button variant="outline" size="sm">
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs + gallery */}
      <UnitDetailTabs
        unitId={params.id}
        number={unit.number}
        status={unit.status}
        type={unit.type}
        floor={unit.floor}
        line={unit.line}
        view={unit.view}
        sqft={unit.sqft}
        mt2={unit.mt2 ? unit.mt2.toString() : null}
        capacity={unit.capacity}
        amenityCap={unit.amenityCap}
        totalBeds={unit.totalBeds}
        bedrooms={unit.bedrooms}
        bathrooms={unit.bathrooms ? unit.bathrooms.toString() : null}
        bathType={unit.bathType}
        kings={unit.kings}
        queens={unit.queens}
        twins={unit.twins}
        otherBeds={unit.otherBeds}
        hasKitchen={unit.hasKitchen}
        hasBalcony={unit.hasBalcony}
        features={unit.features}
        driveFolderUrl={unit.driveFolderUrl}
        photoQuality={unit.photoQuality}
        score={unit.score ? unit.score.toString() : null}
        notes={unit.notes}
        createdAt={unit.createdAt.toISOString()}
        updatedAt={unit.updatedAt.toISOString()}
        listingCount={unit._count.listings}
        contractCount={unit._count.contracts}
        inspectionCount={unit._count.inspections}
        buildingName={unit.building.name}
        buildingId={unit.building.id}
        ownerId={unit.owner?.id ?? null}
        ownerNickname={unit.owner?.nickname ?? null}
        ownerPhone={unit.owner?.phone ?? null}
        ownerEmail={unit.owner?.email ?? null}
        listings={unit.listings}
        folders={folders}
        fileAlerts={fileAlerts}
        alertTypes={alertTypeViews}
        docCanEdit={docCanEdit}
      />
    </div>
  )
}
