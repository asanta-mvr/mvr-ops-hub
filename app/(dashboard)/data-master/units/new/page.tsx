import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { db } from '@/lib/db'
import UnitForm from '@/components/modules/data-master/UnitForm'

export const metadata: Metadata = { title: 'New Unit' }

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: { buildingId?: string }
}) {
  const [buildings, owners] = await Promise.all([
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

  const defaultValues = searchParams.buildingId
    ? { buildingId: searchParams.buildingId }
    : undefined

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Link href="/data-master/units" className="hover:text-mvr-primary">Units</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground">New Unit</span>
        </nav>
        <h1 className="text-2xl font-bold text-mvr-primary">New Unit</h1>
        <p className="text-muted-foreground text-sm mt-1">Add a unit to the portfolio</p>
      </div>

      <UnitForm buildings={buildings} owners={owners} defaultValues={defaultValues} />
    </div>
  )
}
