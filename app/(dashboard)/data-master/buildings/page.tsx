import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import BuildingsMapView from '@/components/modules/data-master/BuildingsMapView'
import type { BuildingFull } from '@/components/modules/data-master/BuildingsMapView'

export const metadata: Metadata = { title: 'Buildings' }

async function getBuildings(): Promise<BuildingFull[]> {
  const buildings = await db.building.findMany({
    include: {
      city:   { include: { state: true } },
      _count: { select: { units: true } },
      units:  { select: { ownerUniqueId: true, _count: { select: { listings: true } } } },
    },
    orderBy: { name: 'asc' },
  })

  return buildings.map((b) => ({
    id:             b.id,
    name:           b.name,
    nickname:       b.nickname,
    status:         b.status,
    lat:            b.lat ? Number(b.lat) : null,
    long:           b.long ? Number(b.long) : null,
    address:        b.address,
    zone:           b.zone,
    zipcode:        b.zipcode,
    googleUrl:      b.googleUrl,
    website:        b.website,
    imageUrl:       b.imageUrl,
    frontdeskPhone: b.frontdeskPhone,
    frontdeskEmail: b.frontdeskEmail,
    frontdeskHours: b.frontdeskHours,
    checkinHours:   b.checkinHours,
    checkoutHours:  b.checkoutHours,
    amenities:      b.amenities,
    unitCount:      b._count.units,
    keyCount:       b.units.reduce((sum, u) => sum + u._count.listings, 0),
    ownerCount:     new Set(b.units.map((u) => u.ownerUniqueId).filter(Boolean)).size,
    createdAt:      b.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    city:           b.city,
  }))
}

export default async function BuildingsPage() {
  const buildings = await getBuildings()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mvr-primary">Buildings</h1>
          <p className="text-muted-foreground text-sm mt-1">{buildings.length} buildings in portfolio</p>
        </div>
        <Link href="/data-master/buildings/new">
          <Button className="bg-mvr-primary hover:bg-mvr-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Building
          </Button>
        </Link>
      </div>

      <BuildingsMapView buildings={buildings} />
    </div>
  )
}
