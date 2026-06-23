import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import ListingsTableView from '@/components/modules/data-master/ListingsTableView'
import type { DataMasterListingRow } from '@/components/modules/data-master/ListingsTableView'

export const metadata: Metadata = { title: 'Listings · Data Master' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

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
        unit: { select: { id: true, number: true, building: { select: { name: true } } } },
      },
    }),
    db.listing.count(),
  ])

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

  const { rows, total } = await getInitialListings()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-mvr-primary">Listings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every listing pushed from Guesty. Open one to review its detail and attach it to a unit.
        </p>
      </div>

      <ListingsTableView initialRows={rows} initialTotal={total} pageSize={PAGE_SIZE} />
    </div>
  )
}
