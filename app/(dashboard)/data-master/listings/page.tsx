import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import ListingsTableView from '@/components/modules/data-master/ListingsTableView'
import type { DataMasterListingRow, BuildingFilterOption } from '@/components/modules/data-master/ListingsTableView'
import { computeUnitSuggestions } from '@/lib/data-master/listing-suggestions'

export const metadata: Metadata = { title: 'Listings · Data Master' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

// Active buildings with the count of listings attached to their units, for the
// left-hand building filter. Counts roll up per-unit listing counts in JS since
// Listing has no direct buildingId (Listing → Unit → Building).
async function getBuildingFilters(): Promise<BuildingFilterOption[]> {
  const buildings = await db.building.findMany({
    where: { status: 'active' },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      units: { select: { _count: { select: { listings: true } } } },
    },
  })

  return buildings.map((b) => ({
    id: b.id,
    name: b.name,
    listingCount: b.units.reduce((sum, u) => sum + u._count.listings, 0),
  }))
}

async function getInitialListings(): Promise<{ rows: DataMasterListingRow[]; total: number }> {
  const [listings, total] = await Promise.all([
    db.listing.findMany({
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        nickname: true,
        guestyId: true,
        sqrFeet: true,
        totalOccupancy: true,
        unitId: true,
        customFields: true,
        unit: { select: { id: true, number: true, building: { select: { name: true } } } },
      },
    }),
    db.listing.count(),
  ])

  const suggestions = await computeUnitSuggestions(
    listings.map((l) => ({ id: l.id, unitId: l.unitId, name: l.name, nickname: l.nickname, customFields: l.customFields }))
  )

  const guestyIds = listings.map((l) => l.guestyId).filter((v): v is string => !!v)
  const projections = guestyIds.length
    ? await db.guestyListing.findMany({
        where: { guestyId: { in: guestyIds } },
        select: {
          guestyId: true,
          pictureUrl: true,
          active: true,
          propertyType: true,
          bedrooms: true,
          bathrooms: true,
          accommodates: true,
        },
      })
    : []
  const projMap = new Map(projections.map((p) => [p.guestyId, p]))

  const rows: DataMasterListingRow[] = listings.map((l) => {
    const p = l.guestyId ? projMap.get(l.guestyId) : undefined
    return {
      id: l.id,
      name: l.name,
      nickname: l.nickname,
      guestyId: l.guestyId,
      sqrFeet: l.sqrFeet,
      totalOccupancy: l.totalOccupancy,
      unitId: l.unitId,
      unitNumber: l.unit ? l.unit.number : null,
      buildingName: l.unit?.building?.name ?? null,
      suggestedUnitId: suggestions.get(l.id)?.suggestedUnitId ?? null,
      suggestedUnitLabel: suggestions.get(l.id)?.suggestedUnitLabel ?? null,
      pictureUrl: p?.pictureUrl ?? null,
      active: p?.active ?? null,
      propertyType: p?.propertyType ?? null,
      bedrooms: p?.bedrooms ?? null,
      bathrooms: p?.bathrooms == null ? null : Number(p.bathrooms),
      accommodates: p?.accommodates ?? null,
    }
  })

  return { rows, total }
}

export default async function ListingsPage() {
  const session = await auth()
  await requireView(session, 'data_master.listings')

  const [{ rows, total }, buildings] = await Promise.all([getInitialListings(), getBuildingFilters()])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-mvr-primary">Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every listing pushed from Guesty. Open one to review its detail and attach it to a unit.
        </p>
      </div>

      <ListingsTableView
        initialRows={rows}
        initialTotal={total}
        pageSize={PAGE_SIZE}
        buildings={buildings}
      />
    </div>
  )
}
