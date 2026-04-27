import type { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { OwnersTableView } from '@/components/modules/data-master/OwnersTableView'
import type { OwnerFull } from '@/components/modules/data-master/OwnersTableView'

export const metadata: Metadata = { title: 'Owners' }

async function getOwners(): Promise<OwnerFull[]> {
  const owners = await db.owner.findMany({
    include: {
      _count: { select: { units: true } },
      units: {
        include: { building: { select: { name: true } } },
        orderBy: [{ buildingId: 'asc' }, { number: 'asc' }],
      },
    },
    orderBy: { nickname: 'asc' },
  })

  return owners.map((o) => ({
    id:             o.id,
    uniqueId:       o.uniqueId,
    nickname:       o.nickname,
    type:           o.type,
    status:         o.status,
    email:          o.email          ?? null,
    otherEmail:     o.otherEmail     ?? null,
    phone:          o.phone          ?? null,
    address:        o.address        ?? null,
    photoUrl:       o.photoUrl       ?? null,
    linkedin:       o.linkedin       ?? null,
    age:            o.age            ?? null,
    nationality:    o.nationality    ?? null,
    language:       o.language,
    siteUser:       o.siteUser       ?? null,
    category:       o.category       ?? null,
    personality:    o.personality    ?? null,
    documentType:   o.documentType   ?? null,
    documentNumber: o.documentNumber ?? null,
    notes:          o.notes          ?? null,
    unitCount:      o._count.units,
    units: o.units.map(u => ({
      id:           u.id,
      number:       u.number,
      buildingName: u.building.name,
      status:       u.status,
      score:        u.score ? String(u.score) : null,
    })),
  }))
}

export default async function OwnersPage() {
  const owners = await getOwners()

  return (
    <div className="space-y-6">
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
