import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Geography: US > Florida > Miami
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

  console.log('✅ Geography seeded')

  // 5 buildings from AppSheet export
  const buildings = [
    {
      id: '6b274e4f',
      name: 'Hotel Arya',
      nickname: 'ARYA',
      address: '2889 McFarlane Rd',
      zone: 'Coconut Grove',
      zipcode: '33133',
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'e9eee448',
      name: 'Private Oasis',
      nickname: 'OASIS',
      address: '2889 McFarlane Rd',
      zone: 'Coconut Grove',
      zipcode: '33133',
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'f9d8eb15',
      name: 'Icon Brickell',
      nickname: 'ICON',
      address: '485 Brickell Avenue',
      zone: 'Brickell',
      zipcode: '33131',
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: '3b08b87b',
      name: 'The Elser',
      nickname: 'ELSER',
      address: '398 NE 5th St',
      zone: 'Brickell',
      zipcode: '33132',
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'b6625228',
      name: 'Natiivo',
      nickname: 'NATIIVO',
      address: '601 NE 1st Avenue',
      zone: 'Brickell',
      zipcode: '33132',
      status: 'active' as const,
      cityId: miami.id,
    },
  ]

  for (const building of buildings) {
    await db.building.upsert({
      where: { id: building.id },
      update: {
        name: building.name,
        nickname: building.nickname,
        address: building.address,
        zone: building.zone,
        zipcode: building.zipcode,
        status: building.status,
        cityId: building.cityId,
      },
      create: building,
    })
    console.log(`  ✅ ${building.name}`)
  }

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
