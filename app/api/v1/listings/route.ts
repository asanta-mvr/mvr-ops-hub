import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { computeUnitSuggestions } from '@/lib/data-master/listing-suggestions'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

const SORT_MAP = {
  listing: 'name',
  created: 'createdAt',
} as const
type SortKey = keyof typeof SORT_MAP

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.listings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const q = searchParams.get('q')?.trim()

    const sortByParam = searchParams.get('sortBy') as SortKey | null
    const sortField = sortByParam && sortByParam in SORT_MAP ? SORT_MAP[sortByParam] : 'name'
    const sortDir: Prisma.SortOrder = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
    const orderBy: Prisma.ListingOrderByWithRelationInput[] = [
      { [sortField]: sortDir } as Prisma.ListingOrderByWithRelationInput,
      { id: 'asc' },
    ]

    const attachedParam = searchParams.get('attached') // 'attached' | 'unattached' | null (all)
    const buildingId = searchParams.get('buildingId')?.trim() // filter to listings whose unit is in this building

    const where: Prisma.ListingWhereInput = {
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(attachedParam === 'attached'
        ? { unitListings: { some: {} } }
        : attachedParam === 'unattached'
          ? { unitListings: { none: {} } }
          : {}),
      // A building filter implies the listing is attached to a unit in that building.
      ...(buildingId ? { unitListings: { some: { unit: { buildingId } } } } : {}),
    }

    const [rows, total] = await Promise.all([
      db.listing.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          nickname: true,
          guestyId: true,
          sqrFeet: true,
          totalOccupancy: true,
          customFields: true,
          unitListings: {
            orderBy: { createdAt: 'asc' },
            select: { unit: { select: { id: true, number: true, building: { select: { name: true } } } } },
          },
        },
      }),
      db.listing.count({ where }),
    ])

    const suggestions = await computeUnitSuggestions(
      rows.map((r) => ({ id: r.id, unitId: r.unitListings[0]?.unit.id ?? null, name: r.name, nickname: r.nickname, customFields: r.customFields }))
    )

    // Merge each Listing with its source GuestyListing projection (thumbnail,
    // status, beds/baths) by guestyId for display.
    const guestyIds = rows.map((r) => r.guestyId).filter((v): v is string => !!v)
    const projections = guestyIds.length
      ? await db.guestyListing.findMany({
          where: { guestyId: { in: guestyIds } },
          select: {
            guestyId: true,
            pictureUrl: true,
            active: true,
            propertyType: true,
            bedrooms: true,
            bathrooms: true,
            accommodates: true,
          },
        })
      : []
    const projMap = new Map(projections.map((p) => [p.guestyId, p]))

    const rowsOut = rows.map((r) => {
      const p = r.guestyId ? projMap.get(r.guestyId) : undefined
      const units = r.unitListings.map((ul) => ({
        id: ul.unit.id,
        number: ul.unit.number,
        buildingName: ul.unit.building?.name ?? null,
      }))
      const firstUnit = units[0] ?? null
      return {
        id: r.id,
        name: r.name,
        nickname: r.nickname,
        guestyId: r.guestyId,
        sqrFeet: r.sqrFeet,
        totalOccupancy: r.totalOccupancy,
        // First attached unit kept for existing single-unit displays; `units`
        // carries the full set for combined listings.
        unitId: firstUnit?.id ?? null,
        unitNumber: firstUnit?.number ?? null,
        buildingName: firstUnit?.buildingName ?? null,
        units,
        unitCount: units.length,
        suggestedUnitId: suggestions.get(r.id)?.suggestedUnitId ?? null,
        suggestedUnitLabel: suggestions.get(r.id)?.suggestedUnitLabel ?? null,
        pictureUrl: p?.pictureUrl ?? null,
        active: p?.active ?? null,
        propertyType: p?.propertyType ?? null,
        bedrooms: p?.bedrooms ?? null,
        bathrooms: p?.bathrooms == null ? null : Number(p.bathrooms),
        accommodates: p?.accommodates ?? null,
      }
    })

    return NextResponse.json({ data: { rows: rowsOut, total, page, pageSize } })
  } catch (error) {
    console.error('[GET /api/v1/listings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
