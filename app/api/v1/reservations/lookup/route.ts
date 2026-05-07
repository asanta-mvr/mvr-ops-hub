import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { lookupReservation } from '@/lib/integrations/bigquery'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const confirmationCode = req.nextUrl.searchParams.get('confirmationCode')
    if (!confirmationCode) {
      return NextResponse.json({ error: 'confirmationCode is required' }, { status: 400 })
    }

    const reservation = await lookupReservation(confirmationCode.trim())
    if (!reservation) return NextResponse.json({ data: null })

    let buildingId: string | null = null
    let unitId:     string | null = null

    // 1. Match unit by listing_nickname → Listing.nickname → Listing.unitId
    if (reservation.unit) {
      const listing = await db.listing.findFirst({
        where:  { nickname: { equals: reservation.unit, mode: 'insensitive' } },
        select: { unitId: true, unit: { select: { buildingId: true } } },
      })
      if (listing) {
        unitId     = listing.unitId
        buildingId = listing.unit.buildingId
      }
    }

    // 2. Fallback: match building by name, then unit by number stripped of building prefix
    if (!buildingId && reservation.property) {
      const building = await db.building.findFirst({
        where:  { name: { equals: reservation.property, mode: 'insensitive' } },
        select: { id: true, name: true },
      })
      buildingId = building?.id ?? null

      if (building && !unitId && reservation.unit) {
        let unitNumber = reservation.unit.trim()
        if (unitNumber.toLowerCase().startsWith(building.name.toLowerCase())) {
          unitNumber = unitNumber.slice(building.name.length).trim()
        }
        const unit = await db.unit.findFirst({
          where: {
            buildingId: building.id,
            number:     { equals: unitNumber, mode: 'insensitive' },
          },
          select: { id: true },
        })
        unitId = unit?.id ?? null
      }
    }

    return NextResponse.json({
      data: {
        ...reservation,
        buildingId,
        unitId,
      },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[GET /api/v1/reservations/lookup]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
