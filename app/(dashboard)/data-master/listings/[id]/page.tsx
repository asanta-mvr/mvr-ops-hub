import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canEdit, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { projectListingToUnitBaseline, projectListingToDataMaster } from '@/lib/integrations/guesty'
import GuestyListingDetail from '@/components/modules/data-master/GuestyListingDetail'
import ListingPhotoGallery, { type GalleryPhoto } from '@/components/modules/data-master/ListingPhotoGallery'
import ListingUnitCockpit from '@/components/modules/data-master/ListingUnitCockpit'
import ListingDataMasterPanel from '@/components/modules/data-master/ListingDataMasterPanel'
import ListingRecordDrift, { type DriftRow } from '@/components/modules/data-master/ListingRecordDrift'
import type { UnitFormValues } from '@/components/modules/data-master/UnitForm'

export const metadata: Metadata = { title: 'Listing · Data Master' }
export const dynamic = 'force-dynamic'

type Raw = Record<string, unknown>
function rec(v: unknown): Raw | null {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export default async function ListingDetailPage({ params }: { params: { id: string } }) {
  const session = await auth()
  await requireView(session, 'data_master.listings')
  const editable = await canEdit(session, 'data_master.listings')

  const listing = await db.listing.findUnique({ where: { id: params.id } })
  if (!listing) notFound()

  // Source Guesty payload + form prerequisites.
  const [source, buildings, owners, allOptions] = await Promise.all([
    listing.guestyId
      ? db.guestyListing.findUnique({ where: { guestyId: listing.guestyId }, select: { raw: true } })
      : Promise.resolve(null),
    db.building.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    db.owner.findMany({ select: { id: true, nickname: true }, where: { status: 'active' }, orderBy: { nickname: 'asc' } }),
    db.unitFieldOption.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
  ])
  const raw = (source?.raw as Raw | undefined) ?? {}

  const prereqs = {
    buildings,
    owners,
    typeOptions: allOptions.filter((o) => o.field === 'type'),
    viewOptions: allOptions.filter((o) => o.field === 'view'),
    featureOptions: allOptions.filter((o) => o.field === 'feature'),
    bathTypeOptions: allOptions.filter((o) => o.field === 'bath_type'),
    statusOptions: allOptions.filter((o) => o.field === 'status'),
  }

  // Guesty-derived structural baseline (unit comparison + create suggestions).
  const guesty = projectListingToUnitBaseline(raw)

  // Resolve the listing's Guesty owners → names + mapping status.
  const ownerIds = Array.isArray(raw.owners) ? raw.owners.filter((v): v is string => typeof v === 'string') : []
  const guestyOwners = ownerIds.length
    ? await db.guestyOwner.findMany({
        where: { guestyId: { in: ownerIds } },
        select: { guestyId: true, fullName: true, ownerUniqueId: true },
      })
    : []
  const ownersForDetail = guestyOwners.map((o) => ({
    guestyId: o.guestyId,
    name: o.fullName ?? o.guestyId,
    mapped: !!o.ownerUniqueId,
  }))

  // Attached unit (full) → comparison summary + edit-form defaults.
  const unit = listing.unitId
    ? await db.unit.findUnique({
        where: { id: listing.unitId },
        include: { building: { select: { name: true } } },
      })
    : null

  const unitSummary = unit
    ? {
        id: unit.id,
        updatedAt: unit.updatedAt.toISOString(),
        number: unit.number,
        buildingName: unit.building?.name ?? null,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms == null ? null : Number(unit.bathrooms),
        capacity: unit.capacity,
        totalBeds: unit.totalBeds,
        sqft: unit.sqft,
        kings: unit.kings,
        queens: unit.queens,
        twins: unit.twins,
        type: unit.type,
      }
    : null

  const unitFormDefaults: Partial<UnitFormValues> | null = unit
    ? (() => {
        const features = [...(unit.features ?? [])]
        if (unit.hasKitchen && !features.includes('kitchen')) features.unshift('kitchen')
        if (unit.hasBalcony && !features.includes('balcony')) features.unshift('balcony')
        return {
          number: unit.number,
          type: unit.type ?? '',
          status: unit.status,
          floor: unit.floor != null ? String(unit.floor) : '',
          line: unit.line ?? '',
          view: unit.view ?? '',
          buildingId: unit.buildingId,
          ownerUniqueId: unit.ownerUniqueId ?? '',
          sqft: unit.sqft != null ? String(unit.sqft) : '',
          mt2: unit.mt2 != null ? String(Number(unit.mt2)) : '',
          bedrooms: unit.bedrooms != null ? String(unit.bedrooms) : '',
          bathrooms: unit.bathrooms != null ? String(Number(unit.bathrooms)) : '',
          bathType: unit.bathType ?? '',
          capacity: unit.capacity != null ? String(unit.capacity) : '',
          amenityCap: unit.amenityCap != null ? String(unit.amenityCap) : '',
          kings: String(unit.kings),
          queens: String(unit.queens),
          twins: String(unit.twins),
          totalBeds: unit.totalBeds != null ? String(unit.totalBeds) : '0',
          otherBeds: unit.otherBeds ?? '',
          features,
          driveFolderUrl: unit.driveFolderUrl ?? '',
          photoQuality: (unit.photoQuality as 'pro' | 'preliminary' | 'low_quality' | null) ?? undefined,
          notes: unit.notes ?? '',
        }
      })()
    : null

  // "Create new unit" suggestions from Guesty (a new unit has nothing to overwrite).
  const address = rec(raw.address)
  const buildingName = str(address?.buildingName)
  const matchedBuilding = buildingName
    ? buildings.find((b) => b.name.trim().toLowerCase() === buildingName.trim().toLowerCase())
    : undefined
  const numberSuggestion = str(address?.unit) ?? str(address?.apt) ?? str(address?.apartment) ?? ''
  const createDefaults: Partial<UnitFormValues> = {
    number: numberSuggestion,
    buildingId: matchedBuilding?.id ?? '',
    status: 'onboarding',
    bedrooms: guesty.bedrooms != null ? String(guesty.bedrooms) : '',
    bathrooms: guesty.bathrooms != null ? String(guesty.bathrooms) : '',
    capacity: guesty.capacity != null ? String(guesty.capacity) : '',
    sqft: guesty.sqft != null ? String(guesty.sqft) : '',
    totalBeds: guesty.totalBeds != null ? String(guesty.totalBeds) : '0',
    kings: String(guesty.kings),
    queens: String(guesty.queens),
    twins: String(guesty.twins),
  }

  // Curated photo set (Data Master) → display list for the gallery.
  const initialPhotos: GalleryPhoto[] = (Array.isArray(listing.photos) ? listing.photos : [])
    .map((p) => (p && typeof p === 'object' ? (p as Record<string, unknown>) : null))
    .filter((p): p is Record<string, unknown> => !!p && typeof p.id === 'string' && typeof p.src === 'string' && (p.kind === 'guesty' || p.kind === 'drive'))
    .map((p) => ({
      id: p.id as string,
      kind: p.kind as 'guesty' | 'drive',
      url: p.kind === 'drive' ? `/api/v1/drive/image/${p.src as string}` : (p.src as string),
      order: typeof p.order === 'number' ? p.order : 0,
    }))
    .sort((a, b) => a.order - b.order)
  const guestyPhotoCount = Array.isArray(raw.pictures) ? raw.pictures.length : 0
  const hasDriveFolder = !!unit?.driveFolderUrl

  // Listing record drift: Data Master (source of truth) vs the Guesty snapshot.
  const gdm = projectListingToDataMaster(raw)
  const listingDrift: DriftRow[] = [
    { label: 'Name', field: 'name', dmVal: listing.name, guestyVal: gdm.name },
    { label: 'Nickname', field: 'nickname', dmVal: listing.nickname, guestyVal: gdm.nickname },
    { label: 'Sq ft', field: 'sqrFeet', dmVal: listing.sqrFeet, guestyVal: gdm.sqrFeet },
    { label: 'Occupancy', field: 'totalOccupancy', dmVal: listing.totalOccupancy, guestyVal: gdm.totalOccupancy },
    { label: 'Airbnb URL', field: 'urlAirbnb', dmVal: listing.urlAirbnb, guestyVal: gdm.urlAirbnb },
    { label: 'Booking URL', field: 'urlBooking', dmVal: listing.urlBooking, guestyVal: gdm.urlBooking },
    { label: 'Vrbo URL', field: 'urlVrbo', dmVal: listing.urlVrbo, guestyVal: gdm.urlVrbo },
  ]

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/data-master/listings"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-mvr-primary"
        >
          <ChevronLeft className="size-4" />
          Listings
        </Link>
        <h1 className="font-display mt-2 text-3xl text-mvr-primary">{listing.nickname || listing.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guesty ID <span className="font-mono">{listing.guestyId ?? '—'}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ListingPhotoGallery
            listingId={listing.id}
            editable={editable}
            initialPhotos={initialPhotos}
            guestyCount={guestyPhotoCount}
            hasDriveFolder={hasDriveFolder}
          />
          <GuestyListingDetail raw={raw} privileged={editable} owners={ownersForDetail} />
        </div>
        <div className="space-y-4">
          <ListingUnitCockpit
            listingId={listing.id}
            editable={editable}
            unit={unitSummary}
            unitFormDefaults={unitFormDefaults}
            createDefaults={createDefaults}
            guesty={guesty}
            prereqs={prereqs}
          />
          <ListingDataMasterPanel
            key={listing.updatedAt.toISOString()}
            listing={{
              id: listing.id,
              name: listing.name,
              nickname: listing.nickname,
              urlAirbnb: listing.urlAirbnb,
              urlBooking: listing.urlBooking,
              urlVrbo: listing.urlVrbo,
              urlExpedia: listing.urlExpedia,
              urlVacasa: listing.urlVacasa,
            }}
            editable={editable}
          />
          <ListingRecordDrift listingId={listing.id} editable={editable} rows={listingDrift} />
        </div>
      </div>
    </div>
  )
}
