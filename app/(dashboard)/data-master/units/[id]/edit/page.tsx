import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { db } from '@/lib/db'
import UnitForm from '@/components/modules/data-master/UnitForm'

export const metadata: Metadata = { title: 'Edit Unit' }

export default async function EditUnitPage({ params }: { params: { id: string } }) {
  const [unit, buildings, owners] = await Promise.all([
    db.unit.findUnique({ where: { id: params.id } }),
    db.building.findMany({
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    db.owner.findMany({
      select:  { uniqueId: true, nickname: true },
      where:   { status: 'active' },
      orderBy: { nickname: 'asc' },
    }),
  ])

  if (!unit) notFound()

  const building = await db.building.findUnique({
    where:  { id: unit.buildingId },
    select: { name: true },
  })

  const defaultValues = {
    number:        unit.number,
    type:          unit.type ?? '',
    status:        unit.status as 'active' | 'inactive' | 'renovation' | 'onboarding',
    floor:         unit.floor  != null ? String(unit.floor)  : '',
    line:          unit.line          ?? '',
    view:          unit.view          ?? '',
    buildingId:    unit.buildingId,
    ownerUniqueId: unit.ownerUniqueId ?? '',
    sqft:          unit.sqft   != null ? String(unit.sqft)   : '',
    mt2:           unit.mt2    != null ? String(Number(unit.mt2))  : '',
    bedrooms:      unit.bedrooms != null ? String(unit.bedrooms) : '',
    bathrooms:     unit.bathrooms != null ? String(Number(unit.bathrooms)) : '',
    capacity:      unit.capacity != null ? String(unit.capacity) : '',
    kings:         String(unit.kings),
    queens:        String(unit.queens),
    twins:         String(unit.twins),
    totalBeds:     unit.totalBeds != null ? String(unit.totalBeds) : '',
    otherBeds:     unit.otherBeds  ?? '',
    hasKitchen:    unit.hasKitchen,
    hasBalcony:    unit.hasBalcony,
    photoUrls:     unit.photoUrls,
    score:         unit.score != null ? String(Number(unit.score)) : '',
    notes:         unit.notes ?? '',
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link href="/data-master/units" className="hover:text-mvr-primary">Units</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/data-master/units/${params.id}`} className="hover:text-mvr-primary">
            Unit {unit.number}
            {building ? ` — ${building.name}` : ''}
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">Edit</span>
        </nav>
        <h1 className="text-2xl font-bold text-mvr-primary">Edit Unit</h1>
        <p className="text-muted-foreground text-sm mt-1">Unit {unit.number}</p>
      </div>

      <UnitForm
        unitId={params.id}
        buildings={buildings}
        owners={owners}
        defaultValues={defaultValues}
      />
    </div>
  )
}
