import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { canEdit, requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { computeUnitSuggestions, customFieldValue } from '@/lib/data-master/listing-suggestions'
import ListingsTableView from '@/components/modules/data-master/ListingsTableView'
import type { DataMasterListingRow, BuildingFilterOption } from '@/components/modules/data-master/ListingsTableView'

export const metadata: Metadata = { title: 'Listings · Data Master' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

// Building filter groups, derived from the listings' "building" custom field
// (the authoritative grouping) rather than the attached unit's building. The
// group key (`id`) is the raw custom-field value (e.g. "Elser"); the display
// name is the canonical Building record when one matches (e.g. "The Elser").
async function getBuildingFilters(): Promise<BuildingFilterOption[]> {
  const [buildings, listings] = await Promise.all([
    db.building.findMany({ where: { status: 'active' }, select: { name: true } }),
    db.listing.findMany({ select: { customFields: true } }),
  ])

  const counts = new Map<string, number>()
  for (const l of listings) {
    const value = customFieldValue(l.customFields, 'building')
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }

  // Prefer the canonical Building name when a value maps to one (substring, both
  // directions — "Elser" ↔ "The Elser", "Icon" ↔ "Icon Brickell").
  const canonical = (value: string): string => {
    const norm = value.trim().toLowerCase()
    const match = buildings.find(
      (b) => b.name.toLowerCase().includes(norm) || norm.includes(b.name.toLowerCase())
    )
    return match?.name ?? value
  }

  return Array.from(counts.entries())
    .map(([value, listingCount]) => ({ id: value, name: canonical(value), listingCount }))
    .sort((a, b) => b.listingCount - a.listingCount)
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
        customFields: true,
        unitListings: {
          orderBy: { createdAt: 'asc' },
          select: { unit: { select: { id: true, number: true, building: { select: { name: true } } } } },
        },
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

  // Same auto-match the GET route surfaces, so suggestions render on first paint.
  const suggestions = await computeUnitSuggestions(
    listings.map((l) => ({
      id: l.id,
      unitId: l.unitListings[0]?.unit.id ?? null,
      name: l.name,
      nickname: l.nickname,
      customFields: l.customFields,
    }))
  )

  const rows: DataMasterListingRow[] = listings.map((l) => {
    const p = l.guestyId ? projMap.get(l.guestyId) : undefined
    const units = l.unitListings.map((ul) => ({
      id: ul.unit.id,
      number: ul.unit.number,
      buildingName: ul.unit.building?.name ?? null,
    }))
    const firstUnit = units[0] ?? null
    return {
      id: l.id,
      name: l.name,
      nickname: l.nickname,
      guestyId: l.guestyId,
      sqrFeet: l.sqrFeet,
      totalOccupancy: l.totalOccupancy,
      unitId: firstUnit?.id ?? null,
      unitNumber: firstUnit?.number ?? null,
      buildingName: firstUnit?.buildingName ?? null,
      units,
      unitCount: units.length,
      suggestedUnitId: suggestions.get(l.id)?.suggestedUnitId ?? null,
      suggestedUnitLabel: suggestions.get(l.id)?.suggestedUnitLabel ?? null,
      listingType: customFieldValue(l.customFields, 'unit_types'),
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
  const editable = await canEdit(session, 'data_master.listings')

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
        editable={editable}
      />
    </div>
  )
}
