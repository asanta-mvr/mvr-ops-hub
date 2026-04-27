import type { Metadata } from 'next'
import { db } from '@/lib/db'
import UnitsTableView from '@/components/modules/data-master/UnitsTableView'
import type { UnitFull } from '@/components/modules/data-master/UnitsTableView'

export const metadata: Metadata = { title: 'Units' }

async function getUnits(): Promise<UnitFull[]> {
  const units = await db.unit.findMany({
    include: {
      building: { select: { name: true, nickname: true } },
      owner:    { select: { nickname: true, phone: true } },
      _count:   { select: { listings: true } },
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
    photoUrls:        u.photoUrls,
    status:           u.status,
    score:            u.score ? String(u.score) : null,
    notes:            u.notes,
    buildingId:       u.buildingId,
    buildingName:     u.building.name,
    buildingNickname: u.building.nickname,
    ownerUniqueId:    u.ownerUniqueId,
    ownerNickname:    u.owner?.nickname ?? null,
    ownerPhone:       u.owner?.phone ?? null,
    listingCount:     u._count.listings,
    createdAt:        u.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  }))
}

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: { buildingId?: string }
}) {
  const [units, buildings] = await Promise.all([
    getUnits(),
    db.building.findMany({
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <UnitsTableView
      units={units}
      buildings={buildings}
      initialBuildingId={searchParams.buildingId}
    />
  )
}
