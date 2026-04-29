import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { db } from '@/lib/db'
import BuildingForm from '@/components/modules/data-master/BuildingForm'

export const metadata: Metadata = { title: 'Edit Building' }

async function getZones(): Promise<string[]> {
  const buildings = await db.building.findMany({
    where: { zone: { not: null } },
    select: { zone: true },
    distinct: ['zone'],
    orderBy: { zone: 'asc' },
  })
  return buildings.map((b) => b.zone).filter((z): z is string => z !== null)
}

export default async function EditBuildingPage({ params }: { params: { id: string } }) {
  const [building, zones] = await Promise.all([
    db.building.findUnique({ where: { id: params.id } }),
    getZones(),
  ])

  if (!building) notFound()

  const defaultValues = {
    name:          building.name,
    nickname:      building.nickname ?? '',
    status:        (building.status ?? 'onboarding') as 'active' | 'inactive' | 'onboarding',
    address:       building.address ?? '',
    zone:          building.zone ?? '',
    zipcode:       building.zipcode ?? '',
    lat:           building.lat  ? String(Number(building.lat))  : '',
    long:          building.long ? String(Number(building.long)) : '',
    googleUrl:     building.googleUrl ?? '',
    website:       building.website ?? '',
    imageUrl:      building.imageUrl ?? '',
    driveFolderUrl: building.floorplanUrls[0] ?? '',
    frontdeskPhone:    building.frontdeskPhone ?? '',
    frontdeskEmail:    building.frontdeskEmail ?? '',
    checkinHours:      building.checkinHours ?? '',
    checkoutHours:     building.checkoutHours ?? '',
    frontdeskHours:    building.frontdeskHours ?? '',
    rules:             building.rules ?? '',
    knowledgeBase:     building.knowledgeBase ?? '',
    amenities:         building.amenities,
    emergencyContacts: Array.isArray(building.emergencyContacts)
      ? (building.emergencyContacts as { name: string; phone: string; role: string }[])
      : [],
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link href="/data-master/buildings" className="hover:text-mvr-primary">Buildings</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/data-master/buildings/${params.id}`} className="hover:text-mvr-primary">
            {building.name}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Edit</span>
        </nav>
        <h1 className="text-2xl font-bold text-mvr-primary">Edit Building</h1>
        <p className="text-muted-foreground text-sm mt-1">{building.name}</p>
      </div>

      <BuildingForm buildingId={params.id} defaultValues={defaultValues} zones={zones} />
    </div>
  )
}
