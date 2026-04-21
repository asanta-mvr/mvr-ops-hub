import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth, validateApiKey } from '@/lib/auth'
import { db } from '@/lib/db'
import { createCommentSchema } from '@/lib/validations/tickets'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'cx_agent']

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const isApiKey = validateApiKey(req)

    if (!session?.user && !isApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session?.user && !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const ticket = await db.supportTicket.findUnique({ where: { id: params.id } })
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const validated = createCommentSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const authorId = session?.user?.id ?? null

    const comment = await db.ticketComment.create({
      data: {
        ticketId: params.id,
        authorId,
        body: validated.data.body,
        isInternal: validated.data.isInternal ?? false,
        source: validated.data.source ?? 'web',
      },
      include: { author: { select: { id: true, name: true, image: true } } },
    })

    const userId = authorId ?? 'system'
    db.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        tableName: 'ticket_comments',
        recordId: comment.id,
        newData: JSON.parse(JSON.stringify(comment)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] ticket_comments CREATE', e))

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/tickets/:id/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
