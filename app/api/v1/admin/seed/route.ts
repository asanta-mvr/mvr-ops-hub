import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// One-time seed endpoint — super_admin only
// POST /api/v1/admin/seed
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const us = await db.country.upsert({
      where: { name: 'United States' },
      update: {},
      create: { name: 'United States', isoCode: 'US' },
    })

    const florida = await db.state.upsert({
      where: { id: 'state-fl' },
      update: {},
      create: { id: 'state-fl', name: 'Florida', isoCode: 'FL', countryId: us.id },
    })

    const miami = await db.city.upsert({
      where: { id: 'city-miami' },
      update: {},
      create: { id: 'city-miami', name: 'Miami', stateId: florida.id },
    })

    const buildings = [
      { id: '6b274e4f', name: 'Hotel Arya', nickname: 'ARYA', address: '2889 McFarlane Rd', zone: 'Coconut Grove', zipcode: '33133', status: 'active' as const },
      { id: 'e9eee448', name: 'Private Oasis', nickname: 'OASIS', address: '2889 McFarlane Rd', zone: 'Coconut Grove', zipcode: '33133', status: 'active' as const },
      { id: 'f9d8eb15', name: 'Icon Brickell', nickname: 'ICON', address: '485 Brickell Avenue', zone: 'Brickell', zipcode: '33131', status: 'active' as const },
      { id: '3b08b87b', name: 'The Elser', nickname: 'ELSER', address: '398 NE 5th St', zone: 'Brickell', zipcode: '33132', status: 'active' as const },
      { id: 'b6625228', name: 'Natiivo', nickname: 'NATIIVO', address: '601 NE 1st Avenue', zone: 'Brickell', zipcode: '33132', status: 'active' as const },
    ]

    const results = []
    for (const b of buildings) {
      const building = await db.building.upsert({
        where: { id: b.id },
        update: { name: b.name, nickname: b.nickname, address: b.address, zone: b.zone, zipcode: b.zipcode, status: b.status, cityId: miami.id },
        create: { ...b, cityId: miami.id },
      })
      results.push(building.name)
    }

    return NextResponse.json({ ok: true, seeded: results })
  } catch (error) {
    console.error('[POST /api/v1/admin/seed]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
