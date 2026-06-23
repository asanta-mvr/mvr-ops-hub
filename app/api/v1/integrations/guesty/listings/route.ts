import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

// Typed columns only — the full `raw` payload is intentionally excluded to keep
// the list response small (it is fetched per-listing when needed in Phase B).
const LISTING_SELECT = {
  id: true,
  guestyId: true,
  title: true,
  nickname: true,
  propertyType: true,
  addressFull: true,
  accommodates: true,
  bedrooms: true,
  bathrooms: true,
  active: true,
  pictureUrl: true,
  createdAtGuesty: true,
  unitId: true,
  syncedAt: true,
} satisfies Prisma.GuestyListingSelect

// Whitelist of sortable columns → Prisma fields (prevents arbitrary sort keys).
const SORT_MAP = {
  listing: 'nickname',
  guestyId: 'guestyId',
  active: 'active',
  created: 'createdAtGuesty',
} as const
type SortKey = keyof typeof SORT_MAP

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = req.nextUrl
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const q = searchParams.get('q')?.trim()

    const sortByParam = searchParams.get('sortBy') as SortKey | null
    const sortField = sortByParam && sortByParam in SORT_MAP ? SORT_MAP[sortByParam] : 'createdAtGuesty'
    const sortDir: Prisma.SortOrder = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'
    // `id` as a tiebreaker keeps pagination stable across pages.
    const orderBy: Prisma.GuestyListingOrderByWithRelationInput[] = [
      { [sortField]: sortDir } as Prisma.GuestyListingOrderByWithRelationInput,
      { id: 'asc' },
    ]

    const statusParam = searchParams.get('status') // 'active' | 'inactive' | null (all)
    const mappedParam = searchParams.get('mapped') // 'mapped' | 'unmapped' | null (all)

    const where: Prisma.GuestyListingWhereInput = {
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { nickname: { contains: q, mode: 'insensitive' } },
              { addressFull: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(statusParam === 'active' ? { active: true } : statusParam === 'inactive' ? { active: false } : {}),
      ...(mappedParam === 'mapped'
        ? { unitId: { not: null } }
        : mappedParam === 'unmapped'
          ? { unitId: null }
          : {}),
    }

    const [rows, total] = await Promise.all([
      db.guestyListing.findMany({
        where,
        select: LISTING_SELECT,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.guestyListing.count({ where }),
    ])

    // Prisma returns Decimal for bathrooms — normalize to a plain number.
    const rowsOut = rows.map((r) => ({ ...r, bathrooms: r.bathrooms == null ? null : Number(r.bathrooms) }))

    return NextResponse.json({ data: { rows: rowsOut, total, page, pageSize } })
  } catch (error) {
    console.error('[GET /api/v1/integrations/guesty/listings]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
