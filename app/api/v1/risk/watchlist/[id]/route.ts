import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALLOWED_RISK_ROLES } from '@/lib/risk/schemas'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.notificationWatchlist.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.notificationWatchlist.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'notification_watchlist',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] watchlist DELETE', e))

    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/risk/watchlist/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
