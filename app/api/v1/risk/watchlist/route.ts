import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALLOWED_RISK_ROLES, watchlistInputSchema } from '@/lib/risk/schemas'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const entries = await db.notificationWatchlist.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { createdBy: { select: { name: true, email: true } } },
    })

    return NextResponse.json({
      data: entries.map((w) => ({
        id: w.id,
        email: w.email,
        cardLast4: w.cardLast4,
        lossUsd: w.lossUsd ? Number(w.lossUsd) : null,
        reason: w.reason,
        createdAt: w.createdAt.toISOString(),
        createdByName: w.createdBy.name ?? w.createdBy.email,
      })),
    })
  } catch (error) {
    console.error('[GET /api/v1/risk/watchlist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = watchlistInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const entry = await db.notificationWatchlist.create({
      data: {
        email: parsed.data.email,
        cardLast4: parsed.data.cardLast4,
        lossUsd: parsed.data.lossUsd,
        reason: parsed.data.reason,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'notification_watchlist',
          recordId: entry.id,
          newData: JSON.parse(JSON.stringify(entry)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] watchlist CREATE', e))

    return NextResponse.json(
      {
        data: {
          id: entry.id,
          email: entry.email,
          cardLast4: entry.cardLast4,
          lossUsd: entry.lossUsd ? Number(entry.lossUsd) : null,
          reason: entry.reason,
          createdAt: entry.createdAt.toISOString(),
          createdByName: entry.createdBy.name ?? entry.createdBy.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[POST /api/v1/risk/watchlist]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
