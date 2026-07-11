/**
 * scripts/backfill-unit-listings.ts
 *
 * One-time backfill for the unit↔listing many-to-many migration: for every
 * Listing that still has a legacy `unitId`, create the matching UnitListing
 * join row. Idempotent (skips rows that already exist). Run this BEFORE the
 * schema step that drops Listing.unitId.
 *
 * Dry run (default — prints the plan, writes NOTHING):
 *   npx tsx --env-file=.env.local scripts/backfill-unit-listings.ts
 * Apply:
 *   npx tsx --env-file=.env.local scripts/backfill-unit-listings.ts --apply
 *
 * Requires the Cloud SQL proxy running and DATABASE_URL in .env.local.
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const APPLY = process.argv.includes('--apply')

async function main() {
  const linked = await db.listing.findMany({
    where: { unitId: { not: null } },
    select: { id: true, name: true, nickname: true, unitId: true },
    orderBy: { name: 'asc' },
  })

  // Existing join rows, so a re-run doesn't duplicate.
  const existing = new Set(
    (await db.unitListing.findMany({ select: { unitId: true, listingId: true } })).map(
      (r) => `${r.unitId}::${r.listingId}`
    )
  )

  const toCreate = linked
    .filter((l) => l.unitId && !existing.has(`${l.unitId}::${l.id}`))
    .map((l) => ({ unitId: l.unitId as string, listingId: l.id, label: l.nickname || l.name }))

  console.log(`\nListings with a legacy unitId : ${linked.length}`)
  console.log(`Join rows already present     : ${existing.size}`)
  console.log(`Join rows to create           : ${toCreate.length}\n`)

  for (const c of toCreate) {
    console.log(`  + ${c.listingId}  ->  unit ${c.unitId}   [${c.label}]`)
  }

  if (!APPLY) {
    console.log('\nDRY RUN — nothing was written. Re-run with --apply to create the join rows.')
    return
  }

  console.log('\nAPPLYING…')
  const res = await db.unitListing.createMany({
    data: toCreate.map(({ unitId, listingId }) => ({ unitId, listingId })),
    skipDuplicates: true,
  })
  const total = await db.unitListing.count()
  console.log(`\nDone. Created ${res.count} join row(s). unit_listings total is now ${total}.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
