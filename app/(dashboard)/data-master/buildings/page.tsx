import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Buildings' }

async function getBuildings() {
  return db.building.findMany({
    include: {
      city: { include: { state: true } },
      _count: { select: { units: true } },
    },
    orderBy: { name: 'asc' },
  })
}

const statusStyles: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success border-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning border-mvr-warning',
  inactive:   'bg-mvr-neutral text-[#888] border-[#ccc]',
}

export default async function BuildingsPage() {
  const buildings = await getBuildings()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mvr-primary">Buildings</h1>
          <p className="text-muted-foreground text-sm mt-1">{buildings.length} buildings total</p>
        </div>
        <Link href="/data-master/buildings/new">
          <Button className="bg-mvr-primary hover:bg-mvr-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            New Building
          </Button>
        </Link>
      </div>

      {buildings.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center">
          <p className="text-muted-foreground">No buildings yet.</p>
          <Link href="/data-master/buildings/new" className="mt-4 inline-block">
            <Button className="bg-mvr-primary hover:bg-mvr-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add First Building
            </Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-mvr-neutral border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Units</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {buildings.map((building) => (
                <tr key={building.id} className="hover:bg-mvr-neutral/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/data-master/buildings/${building.id}`}
                      className="font-medium text-mvr-primary hover:underline"
                    >
                      {building.name}
                    </Link>
                    {building.nickname && (
                      <span className="text-xs text-muted-foreground ml-2">({building.nickname})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {building.city
                      ? `${building.city.name}, ${building.city.state?.isoCode ?? ''}`
                      : building.address ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        statusStyles[building.status] ?? statusStyles.inactive
                      }`}
                    >
                      {building.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{building._count.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
