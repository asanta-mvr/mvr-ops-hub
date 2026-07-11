import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react'
import { auth } from '@/lib/auth'
import { canEdit, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { normalizePhotoQuality } from '@/lib/validations/unit'
import {
  projectListingToUnitBaseline,
  projectListingToDataMaster,
  projectListingCustomFields,
  type ListingCustomField,
} from '@/lib/integrations/guesty'
import GuestyListingDetail from '@/components/modules/data-master/GuestyListingDetail'
import ListingPhotoGallery, { type GalleryPhoto } from '@/components/modules/data-master/ListingPhotoGallery'
import ListingDataMasterPanel from '@/components/modules/data-master/ListingDataMasterPanel'
import ListingComparisonCard, {
  type DmDriftRow,
  type UnitDriftRow,
  type CfDriftRow,
} from '@/components/modules/data-master/ListingComparisonCard'
import OwnershipCard from '@/components/modules/data-master/OwnershipCard'
import ListingCustomFieldsCard from '@/components/modules/data-master/ListingCustomFieldsCard'
import { ListingDetailTabs } from '@/components/modules/data-master/ListingDetailTabs'
import UnitForm, { type UnitFormValues } from '@/components/modules/data-master/UnitForm'

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
  const listingCustomFields: ListingCustomField[] = Array.isArray(listing.customFields)
    ? (listing.customFields as unknown as ListingCustomField[])
    : []

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

  // Attached units (many-to-many). All attached units are shown read-only; the
  // first one drives the Guesty comparison + the Data Master editor below.
  const attachedLinks = await db.unitListing.findMany({
    where: { listingId: listing.id },
    orderBy: { createdAt: 'asc' },
    select: { unit: { select: { id: true, number: true, building: { select: { name: true } } } } },
  })
  const attachedUnits = attachedLinks.map((ul) => ({
    id: ul.unit.id,
    number: ul.unit.number,
    buildingName: ul.unit.building?.name ?? null,
  }))
  const firstUnitId = attachedUnits[0]?.id ?? null

  const unit = firstUnitId
    ? await db.unit.findUnique({
        where: { id: firstUnitId },
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

  // Unit ↔ Guesty custom-field comparison rows (only when a unit is attached).
  // Guesty values are resolved live from the raw payload via the synced
  // definitions catalog (fieldId → displayName), then matched to Unit fields.
  const cfRows: CfDriftRow[] = []
  if (unit) {
    const cfDefs = await db.guestyCustomField.findMany({
      where: { objectType: 'listing' },
      select: { guestyId: true, displayName: true, type: true },
    })
    const cfDefsMap = new Map(cfDefs.map((d) => [d.guestyId, { displayName: d.displayName, type: d.type }]))
    const cfByName = new Map(projectListingCustomFields(raw, cfDefsMap).map((f) => [f.name, f]))
    const g = (key: string) => cfByName.get(key)?.value ?? null
    cfRows.push(
      { label: 'Category', unitField: 'category', kind: 'text', unitVal: unit.category, guestyVal: g('category') },
      { label: 'Type of property', unitField: 'typeOfProperty', kind: 'text', unitVal: unit.typeOfProperty, guestyVal: g('type_of_property') },
      { label: 'View', unitField: 'view', kind: 'text', unitVal: unit.view, guestyVal: g('view_type') },
      { label: 'Kitchen', unitField: 'hasKitchen', kind: 'boolEnum', unitVal: unit.hasKitchen, guestyVal: g('kitchen_type') },
      { label: 'Balcony', unitField: 'hasBalcony', kind: 'bool', unitVal: unit.hasBalcony, guestyVal: g('balcony') },
      { label: 'Parking spot', unitField: 'parkingSpot', kind: 'text', unitVal: unit.parkingSpot, guestyVal: g('parking_spot') },
      { label: 'Key type', unitField: 'keyType', kind: 'text', unitVal: unit.keyType, guestyVal: g('key_type') },
      { label: 'eKey', unitField: 'ekey', kind: 'number', unitVal: unit.ekey, guestyVal: g('ekey') },
      { label: 'MVR portfolio', unitField: 'mvrPortfolio', kind: 'bool', unitVal: unit.mvrPortfolio, guestyVal: g('mvr_portfolio') },
      { label: 'Unit types', unitField: 'unitTypes', kind: 'text', unitVal: unit.unitTypes, guestyVal: g('unit_types') },
    )
  }

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
          category: unit.category ?? '',
          typeOfProperty: unit.typeOfProperty ?? '',
          parkingSpot: unit.parkingSpot ?? '',
          keyType: unit.keyType ?? '',
          ekey: unit.ekey != null ? String(unit.ekey) : '',
          mvrPortfolio: unit.mvrPortfolio ?? false,
          unitTypes: unit.unitTypes ?? '',
          driveFolderUrl: unit.driveFolderUrl ?? '',
          photoQuality: normalizePhotoQuality(unit.photoQuality),
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
  // Only fields that can be pushed to update the Guesty listing (channel URLs are
  // channel-derived / read-only, so they're excluded from the comparison).
  const listingDrift: DmDriftRow[] = [
    { label: 'Name', field: 'name', dmVal: listing.name, guestyVal: gdm.name },
    { label: 'Nickname', field: 'nickname', dmVal: listing.nickname, guestyVal: gdm.nickname },
    { label: 'Sq ft', field: 'sqrFeet', dmVal: listing.sqrFeet, guestyVal: gdm.sqrFeet },
    { label: 'Occupancy', field: 'totalOccupancy', dmVal: listing.totalOccupancy, guestyVal: gdm.totalOccupancy },
  ]

  // Unit vs Guesty structural comparison rows (only when a unit is attached).
  const unitRows: UnitDriftRow[] = unitSummary
    ? [
        { label: 'Bedrooms', field: 'bedrooms', unitVal: unitSummary.bedrooms, guestyVal: guesty.bedrooms },
        { label: 'Bathrooms', field: 'bathrooms', unitVal: unitSummary.bathrooms, guestyVal: guesty.bathrooms },
        { label: 'Capacity', field: 'capacity', unitVal: unitSummary.capacity, guestyVal: guesty.capacity },
        { label: 'Total beds', field: 'totalBeds', unitVal: unitSummary.totalBeds, guestyVal: guesty.totalBeds },
        { label: 'Sq ft', field: 'sqft', unitVal: unitSummary.sqft, guestyVal: guesty.sqft },
        { label: 'King beds', field: 'kings', unitVal: unitSummary.kings, guestyVal: guesty.kings },
        { label: 'Queen beds', field: 'queens', unitVal: unitSummary.queens, guestyVal: guesty.queens },
        { label: 'Twin beds', field: 'twins', unitVal: unitSummary.twins, guestyVal: guesty.twins },
      ]
    : []

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
        {/* Left: tabbed info + editable Data Master */}
        <div className="lg:col-span-2">
          <ListingDetailTabs
            basicInfo={
              <>
                {/* Read-only: units are attached from the unit side (Data Master →
                    Unit → Listings). A listing may span several units (combined). */}
                <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
                  <h3 className="font-display text-lg text-mvr-primary">
                    {attachedUnits.length > 1 ? 'Units' : 'Unit'}
                  </h3>
                  {attachedUnits.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      No unit attached. Attach this listing from a unit&rsquo;s Listings tab in Data Master.
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {attachedUnits.map((u) => (
                        <li key={u.id}>
                          <Link
                            href={`/data-master/units/${u.id}`}
                            className="flex items-center gap-2 rounded-lg border border-[#E0DBD4] px-3 py-2 text-sm text-mvr-olive transition-colors hover:bg-mvr-neutral/50"
                          >
                            <Building2 className="size-4 shrink-0 text-mvr-steel" />
                            <span className="font-medium">
                              {u.buildingName ? `${u.buildingName} · ` : ''}Unit {u.number}
                            </span>
                            <ChevronRight className="ml-auto size-4 shrink-0 text-mvr-primary/40" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <GuestyListingDetail raw={raw} privileged={editable} part="basic" />
                <ListingCustomFieldsCard customFields={listingCustomFields} />
                <OwnershipCard owners={ownersForDetail} />
                <GuestyListingDetail raw={raw} privileged={editable} part="access" />
              </>
            }
            description={<GuestyListingDetail raw={raw} privileged={editable} part="description" />}
            photos={
              <ListingPhotoGallery
                listingId={listing.id}
                editable={editable}
                initialPhotos={initialPhotos}
                guestyCount={guestyPhotoCount}
                hasDriveFolder={hasDriveFolder}
              />
            }
            dataMaster={
              unit && unitFormDefaults ? (
                // Attached: one unified editor saves the unit AND the listing fields.
                <UnitForm
                  key={listing.updatedAt.toISOString()}
                  unitId={unit.id}
                  buildings={prereqs.buildings}
                  owners={prereqs.owners}
                  defaultValues={unitFormDefaults}
                  currentScore={unit.score != null ? String(Number(unit.score)) : undefined}
                  typeOptions={prereqs.typeOptions}
                  viewOptions={prereqs.viewOptions}
                  featureOptions={prereqs.featureOptions}
                  bathTypeOptions={prereqs.bathTypeOptions}
                  statusOptions={prereqs.statusOptions}
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
                  stayOnPage
                />
              ) : (
                // Not attached: no unit to edit — just the listing's editable fields.
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
              )
            }
          />
        </div>

        {/* Right: comparison card only (pushable-to-Guesty fields) */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          {/* Title aligned with the tab bar; card sits below */}
          <div className="flex h-12 items-center justify-center gap-2 border-b border-[#E0DBD4] pb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/guesty.png" alt="Guesty" className="size-5 rounded-sm" />
            <h2 className="font-display text-lg text-mvr-primary">Guesty Comparison</h2>
          </div>
          <div className="mt-4">
            <ListingComparisonCard
              listingId={listing.id}
              unitId={unit?.id ?? null}
              editable={editable}
              dmRows={listingDrift}
              unitRows={unitRows}
              cfRows={cfRows}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
