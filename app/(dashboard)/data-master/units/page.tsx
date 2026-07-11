import type { Metadata } from 'next'
import { db } from '@/lib/db'
import UnitsTableView from '@/components/modules/data-master/UnitsTableView'
import type { UnitFull } from '@/components/modules/data-master/UnitsTableView'

export const metadata: Metadata = { title: 'Units' }

async function getUnits(): Promise<UnitFull[]> {
  const units = await db.unit.findMany({
    // All statuses (including 'inactive') are listed; the client status filter
    // narrows to a status when selected. Deletion is now a permanent erase, so
    // there are no soft-deleted rows to hide.
    include: {
      building: { select: { name: true, nickname: true } },
      owner:    { select: { nickname: true, phone: true } },
      _count:   { select: { unitListings: true } },
    },
    orderBy: { number: 'asc' },
  })

  return units.map((u) => ({
    id:               u.id,
    number:           u.number,
    floor:            u.floor,
    line:             u.line,
    view:             u.view,
    type:             u.type ?? null,
    bedrooms:         u.bedrooms,
    bathrooms:        u.bathrooms ? String(u.bathrooms) : null,
    bathType:         u.bathType ?? null,
    sqft:             u.sqft,
    mt2:              u.mt2 ? String(u.mt2) : null,
    capacity:         u.capacity,
    totalBeds:        u.totalBeds,
    kings:            u.kings,
    queens:           u.queens,
    twins:            u.twins,
    otherBeds:        u.otherBeds,
    hasKitchen:       u.hasKitchen,
    hasBalcony:       u.hasBalcony,
    status:           u.status,
    score:            u.score ? String(u.score) : null,
    notes:            u.notes,
    driveFolderUrl:   u.driveFolderUrl,
    buildingId:       u.buildingId,
    buildingName:     u.building.name,
    buildingNickname: u.building.nickname,
    ownerUniqueId:    u.ownerUniqueId,
    ownerNickname:    u.owner?.nickname ?? null,
    ownerPhone:       u.owner?.phone ?? null,
    listingCount:     u._count.unitListings,
    createdAt:        u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }))
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: { buildingId?: string }
}) {
  const [units, buildings, owners, allOptions] = await Promise.all([
    getUnits(),
    db.building.findMany({
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.owner.findMany({
      select:  { id: true, nickname: true },
      where:   { status: 'active' },
      orderBy: { nickname: 'asc' },
    }),
    db.unitFieldOption.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    }),
  ])

  // Split field options by group and trim to what the form needs (the edit modal
  // reuses these instead of refetching on every open).
  const pick = (field: string) =>
    allOptions.filter(o => o.field === field).map(o => ({ id: o.id, value: o.value, label: o.label }))
  const options = {
    type:     pick('type'),
    view:     pick('view'),
    feature:  pick('feature'),
    bathType: pick('bath_type'),
    status:   pick('status'),
  }

  return (
    <UnitsTableView
      units={units}
      buildings={buildings}
      owners={owners}
      options={options}
      initialBuildingId={searchParams.buildingId}
    />
  )
}
