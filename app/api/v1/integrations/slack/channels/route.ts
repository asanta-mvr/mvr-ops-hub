import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const DEFAULT_PAGE_SIZE = 50
const MAX_PAGE_SIZE = 200

// GET /api/v1/integrations/slack/channels
// Paginated read of the cached channel mirror. Powers the channels table and
// the channel picker used by notification routing.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'integrations'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const page = Math.max(1, Number(sp.get('page')) || 1)
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(sp.get('pageSize')) || DEFAULT_PAGE_SIZE))
    const search = sp.get('search')?.trim() ?? ''
    const includeArchived = sp.get('includeArchived') === 'true'

    const where: Prisma.SlackChannelWhereInput = {}
    if (!includeArchived) where.isArchived = false
    if (search) where.name = { contains: search, mode: 'insensitive' }

    const [rows, total] = await Promise.all([
      db.slackChannel.findMany({
        where,
        select: {
          id: true,
          slackChannelId: true,
          name: true,
          isPrivate: true,
          isArchived: true,
          isMember: true,
          numMembers: true,
          syncedAt: true,
        },
        orderBy: [{ name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.slackChannel.count({ where }),
    ])

    return NextResponse.json({
      data: {
        rows: rows.map((r) => ({ ...r, syncedAt: r.syncedAt.toISOString() })),
        total,
        page,
        pageSize,
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/integrations/slack/channels]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
