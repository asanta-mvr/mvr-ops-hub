import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

// Typed columns only — the full `raw` payload is excluded to keep list responses small.
const OWNER_SELECT = {
  id: true,
  guestyId: true,
  fullName: true,
  email: true,
  phone: true,
  ownerType: true,
  pictureUrl: true,
  listingCount: true,
  createdAtGuesty: true,
  ownerUniqueId: true,
  suggestedOwnerId: true,
  syncedAt: true,
  owner: { select: { id: true, nickname: true } },
} satisfies Prisma.GuestyOwnerSelect

const SORT_MAP = {
  owner: 'fullName',
  guestyId: 'guestyId',
  listings: 'listingCount',
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
    const sortField = sortByParam && sortByParam in SORT_MAP ? SORT_MAP[sortByParam] : 'fullName'
    const sortDir: Prisma.SortOrder = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc'
    const orderBy: Prisma.GuestyOwnerOrderByWithRelationInput[] = [
      { [sortField]: sortDir } as Prisma.GuestyOwnerOrderByWithRelationInput,
      { id: 'asc' },
    ]

    const mappedParam = searchParams.get('mapped') // 'mapped' | 'unmapped' | null (all)

    const where: Prisma.GuestyOwnerWhereInput = {
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(mappedParam === 'mapped'
        ? { ownerUniqueId: { not: null } }
        : mappedParam === 'unmapped'
          ? { ownerUniqueId: null }
          : {}),
    }

    const [rows, total] = await Promise.all([
      db.guestyOwner.findMany({ where, select: OWNER_SELECT, orderBy, skip: (page - 1) * pageSize, take: pageSize }),
      db.guestyOwner.count({ where }),
    ])

    // Resolve suggested-owner names for the rows on this page.
    const suggestedIds = Array.from(new Set(rows.map((r) => r.suggestedOwnerId).filter((v): v is string => !!v)))
    const suggestedOwners = suggestedIds.length
      ? await db.owner.findMany({ where: { id: { in: suggestedIds } }, select: { id: true, nickname: true } })
      : []
    const suggMap = new Map(suggestedOwners.map((o) => [o.id, o.nickname]))

    const rowsOut = rows.map((r) => ({
      ...r,
      suggestedOwnerName: r.suggestedOwnerId ? suggMap.get(r.suggestedOwnerId) ?? null : null,
    }))

    return NextResponse.json({ data: { rows: rowsOut, total, page, pageSize } })
  } catch (error) {
    console.error('[GET /api/v1/integrations/guesty/owners]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
