import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ── Geography ────────────────────────────────────────────────────────────

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

  // ── Buildings (data from AppSheet export — Google Sheet "Buildings" tab) ──

  const buildingData = [
    {
      id: '6b274e4f',
      name: 'Hotel Arya',
      nickname: 'Arya',
      address: '2889 McFarlane Rd',
      zone: 'Coconut Grove',
      zipcode: '33133',
      lat: 25.727440632196725,
      long: -80.24078263558212,
      googleUrl: 'https://maps.app.goo.gl/BXnmAJrpsHuiqvPg9',
      website: 'https://www.aryahotel.us/',
      imageUrl: 'Buildings_Images/6b274e4f.building_image.015122.jpg',
      floorplanUrls: [] as string[],
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'e9eee448',
      name: 'Private Oasis',
      nickname: 'PO',
      address: '2889 McFarlane Rd',
      zone: 'Coconut Grove',
      zipcode: '33133',
      lat: 25.727440632196725,
      long: -80.24078263558212,
      googleUrl: 'https://maps.app.goo.gl/BXnmAJrpsHuiqvPg9',
      website: 'https://www.aryahotel.us/',
      imageUrl: 'Buildings_Images/e9eee448.building_image.015135.jpg',
      floorplanUrls: [] as string[],
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'f9d8eb15',
      name: 'Icon Brickell',
      nickname: 'Icon',
      address: '485 Brickell Avenue',
      zone: 'Brickell',
      zipcode: '33131',
      lat: 25.76845892355281,
      long: -80.18899188329644,
      googleUrl: 'https://maps.app.goo.gl/cMad8icqY2xzwc736',
      website: 'https://www.iconbrickellmiamicondos.com/',
      imageUrl: 'Buildings_Images/f9d8eb15.building_image.014849.jpg',
      floorplanUrls: ['Buildings_Images/f9d8eb15.building_floorplans.183325.png'],
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: '3b08b87b',
      name: 'The Elser',
      nickname: 'Elser',
      address: '398 NE 5th St',
      zone: 'Brickell',
      zipcode: '33132',
      lat: 25.77910958625644,
      long: -80.18907620485489,
      googleUrl: 'https://maps.app.goo.gl/vvZfjZFtaZ3XW7WSA',
      website: 'https://www.theelsermiami.com/',
      imageUrl: 'Buildings_Images/96238628.building_image.014943.jpg',
      floorplanUrls: [] as string[],
      status: 'active' as const,
      cityId: miami.id,
    },
    {
      id: 'b6625228',
      name: 'Natiivo',
      nickname: 'Natiivo',
      address: '601 NE 1st Avenue',
      zone: 'Brickell',
      zipcode: '33132',
      lat: 25.76845892355281,
      long: -80.18899188329644,
      googleUrl: 'https://maps.app.goo.gl/Bs67D4SGdrC8agGx5',
      website: 'https://natiivo.com/',
      imageUrl: 'Buildings_Images/b6625228.building_image.015019.jpg',
      floorplanUrls: [] as string[],
      status: 'active' as const,
      cityId: miami.id,
    },
  ]

  for (const b of buildingData) {
    await db.building.upsert({
      where: { id: b.id },
      update: b,
      create: b,
    })
    console.log(`  ✅ Building: ${b.name}`)
  }

  // ── Owners ───────────────────────────────────────────────────────────────

  const owners = [
    {
      id: 'owner-001',
      uniqueId: 'MVR-OWN-001',
      nickname: 'John Smith',
      type: 'individual' as const,
      phone: '+1 (305) 555-0101',
      email: 'j.smith@email.com',
      nationality: 'American',
      language: 'en',
      status: 'active' as const,
    },
    {
      id: 'owner-002',
      uniqueId: 'MVR-OWN-002',
      nickname: 'Maria Garcia',
      type: 'individual' as const,
      phone: '+1 (786) 555-0202',
      email: 'maria.garcia@email.com',
      nationality: 'Venezuelan',
      language: 'es',
      status: 'active' as const,
    },
    {
      id: 'owner-003',
      uniqueId: 'MVR-OWN-003',
      nickname: 'Carlos Rodriguez',
      type: 'individual' as const,
      phone: '+1 (305) 555-0303',
      email: 'c.rodriguez@email.com',
      nationality: 'Colombian',
      language: 'es',
      status: 'active' as const,
    },
    {
      id: 'owner-004',
      uniqueId: 'MVR-OWN-004',
      nickname: 'Sunshine Properties LLC',
      type: 'company' as const,
      phone: '+1 (305) 555-0404',
      email: 'info@sunshineproperties.com',
      language: 'en',
      status: 'active' as const,
    },
    {
      id: 'owner-005',
      uniqueId: 'MVR-OWN-005',
      nickname: 'Ana Pereira',
      type: 'individual' as const,
      phone: '+1 (786) 555-0505',
      email: 'ana.pereira@email.com',
      nationality: 'Brazilian',
      language: 'pt',
      status: 'active' as const,
    },
  ]

  for (const owner of owners) {
    await db.owner.upsert({
      where: { id: owner.id },
      update: owner,
      create: owner,
    })
    console.log(`  ✅ Owner: ${owner.nickname}`)
  }

  // ── Units ────────────────────────────────────────────────────────────────

  const units = [
    // Icon Brickell — Tower 1 & 3 mixed
    { id: 'unit-icon-01', number: '4501', floor: 45, line: 'A', view: 'Bay View', type: 'studio' as const,    bedrooms: 0, bathrooms: 1,   sqft: 520,  buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-001', status: 'active' as const },
    { id: 'unit-icon-02', number: '3802', floor: 38, line: 'B', view: 'City View', type: 'one_br' as const,   bedrooms: 1, bathrooms: 1,   sqft: 780,  buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-002', status: 'active' as const },
    { id: 'unit-icon-03', number: '2704', floor: 27, line: 'D', view: 'Pool View', type: 'two_br' as const,   bedrooms: 2, bathrooms: 2,   sqft: 1150, buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-003', status: 'active' as const },
    { id: 'unit-icon-04', number: '1506', floor: 15, line: 'F', view: 'City View', type: 'one_br' as const,   bedrooms: 1, bathrooms: 1,   sqft: 810,  buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-004', status: 'active' as const },
    { id: 'unit-icon-05', number: '5201', floor: 52, line: 'A', view: 'Bay View', type: 'two_br' as const,    bedrooms: 2, bathrooms: 2.5, sqft: 1420, buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-001', status: 'active' as const },
    { id: 'unit-icon-06', number: '0807', floor: 8,  line: 'G', view: 'Pool View', type: 'studio' as const,   bedrooms: 0, bathrooms: 1,   sqft: 495,  buildingId: 'f9d8eb15', ownerUniqueId: 'MVR-OWN-005', status: 'onboarding' as const },

    // The Elser
    { id: 'unit-elser-01', number: '2201', floor: 22, line: 'A', view: 'City View', type: 'studio' as const,  bedrooms: 0, bathrooms: 1,   sqft: 450,  buildingId: '3b08b87b', ownerUniqueId: 'MVR-OWN-002', status: 'active' as const },
    { id: 'unit-elser-02', number: '1502', floor: 15, line: 'B', view: 'Bay View',  type: 'one_br' as const,  bedrooms: 1, bathrooms: 1,   sqft: 720,  buildingId: '3b08b87b', ownerUniqueId: 'MVR-OWN-003', status: 'active' as const },
    { id: 'unit-elser-03', number: '3104', floor: 31, line: 'D', view: 'Bay View',  type: 'two_br' as const,  bedrooms: 2, bathrooms: 2,   sqft: 1080, buildingId: '3b08b87b', ownerUniqueId: 'MVR-OWN-004', status: 'active' as const },

    // Natiivo
    { id: 'unit-nat-01', number: '1205', floor: 12, line: 'E', view: 'City View', type: 'studio' as const,    bedrooms: 0, bathrooms: 1,   sqft: 480,  buildingId: 'b6625228', ownerUniqueId: 'MVR-OWN-005', status: 'active' as const },
    { id: 'unit-nat-02', number: '0810', floor: 8,  line: 'J', view: 'Pool View', type: 'one_br' as const,    bedrooms: 1, bathrooms: 1,   sqft: 690,  buildingId: 'b6625228', ownerUniqueId: 'MVR-OWN-001', status: 'active' as const },
    { id: 'unit-nat-03', number: '2003', floor: 20, line: 'C', view: 'City View', type: 'one_br' as const,    bedrooms: 1, bathrooms: 1,   sqft: 710,  buildingId: 'b6625228', ownerUniqueId: 'MVR-OWN-002', status: 'renovation' as const },

    // Hotel Arya
    { id: 'unit-arya-01', number: '301', floor: 3,  line: 'A', view: 'Garden View', type: 'studio' as const,  bedrooms: 0, bathrooms: 1,   sqft: 380,  buildingId: '6b274e4f', ownerUniqueId: 'MVR-OWN-003', status: 'active' as const },
    { id: 'unit-arya-02', number: '215', floor: 2,  line: 'B', view: 'Pool View',   type: 'one_br' as const,  bedrooms: 1, bathrooms: 1,   sqft: 620,  buildingId: '6b274e4f', ownerUniqueId: 'MVR-OWN-004', status: 'active' as const },

    // Private Oasis
    { id: 'unit-oasis-01', number: 'A1', floor: 1, line: 'A', view: 'Garden View', type: 'two_br' as const,   bedrooms: 2, bathrooms: 2,   sqft: 1200, buildingId: 'e9eee448', ownerUniqueId: 'MVR-OWN-005', status: 'active' as const },
    { id: 'unit-oasis-02', number: 'B2', floor: 2, line: 'B', view: 'Pool View',   type: 'three_br' as const, bedrooms: 3, bathrooms: 3,   sqft: 1800, buildingId: 'e9eee448', ownerUniqueId: 'MVR-OWN-001', status: 'active' as const },
  ]

  for (const unit of units) {
    await db.unit.upsert({
      where: { id: unit.id },
      update: unit,
      create: unit,
    })
    console.log(`  ✅ Unit: ${unit.buildingId.slice(0, 6)} #${unit.number}`)
  }

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
