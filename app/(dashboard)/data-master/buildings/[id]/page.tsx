import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Building Detail' }

export default async function BuildingDetailPage({ params }: { params: { id: string } }) {
  const building = await db.building.findUnique({
    where: { id: params.id },
    include: {
      city: { include: { state: { include: { country: true } } } },
      units: { orderBy: { number: 'asc' } },
      propertyManagers: true,
    },
  })

  if (!building) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">{building.name}</h1>
        {building.address && (
          <p className="text-muted-foreground text-sm mt-1">{building.address}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold">Details</h2>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium capitalize">{building.status}</dd>
            </div>
            {building.checkinHours && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check-in</dt>
                <dd>{building.checkinHours}</dd>
              </div>
            )}
            {building.checkoutHours && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Check-out</dt>
                <dd>{building.checkoutHours}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Units</dt>
              <dd>{building.units.length}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-xl border p-5 space-y-3">
          <h2 className="font-semibold">Units ({building.units.length})</h2>
          {building.units.length === 0 ? (
            <p className="text-sm text-muted-foreground">No units yet.</p>
          ) : (
            <ul className="text-sm space-y-1">
              {building.units.slice(0, 10).map((unit) => (
                <li key={unit.id} className="flex justify-between">
                  <span>Unit {unit.number}</span>
                  <span className="text-muted-foreground capitalize">{unit.status}</span>
                </li>
              ))}
              {building.units.length > 10 && (
                <li className="text-muted-foreground">
                  +{building.units.length - 10} more units
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
