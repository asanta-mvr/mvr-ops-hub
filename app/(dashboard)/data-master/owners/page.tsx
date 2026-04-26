import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { OwnersTableView } from '@/components/modules/data-master/OwnersTableView'
import type { OwnerRow } from '@/components/modules/data-master/OwnersTableView'

export const metadata: Metadata = { title: 'Owners' }

async function getOwners(): Promise<OwnerRow[]> {
  const owners = await db.owner.findMany({
    include: { _count: { select: { units: true } } },
    orderBy: { nickname: 'asc' },
  })

  return owners.map((o) => ({
    id:          o.id,
    uniqueId:    o.uniqueId,
    nickname:    o.nickname,
    type:        o.type,
    status:      o.status,
    email:       o.email ?? null,
    phone:       o.phone ?? null,
    nationality: o.nationality ?? null,
    language:    o.language,
    unitCount:   o._count.units,
  }))
}

export default async function OwnersPage() {
  const owners = await getOwners()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
          <Link href="/data-master" className="hover:text-mvr-primary transition-colors">Data Master</Link>
          <span>/</span>
          <span>Owners</span>
        </nav>
        <h1 className="text-2xl font-display font-bold text-mvr-primary">Owners</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All property owners in the MVR portfolio — {owners.length} total.
        </p>
      </div>

      <OwnersTableView owners={owners} />
    </div>
  )
}
