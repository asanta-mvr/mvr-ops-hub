import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth, validateApiKey } from '@/lib/auth'
import { db } from '@/lib/db'
import { updateTicketSchema } from '@/lib/validations/tickets'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'cx_agent']

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const ticket = await db.supportTicket.findUnique({
      where: { id: params.id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        listing: { select: { id: true, name: true } },
        unit: { select: { id: true, number: true, buildingId: true } },
        building: { select: { id: true, name: true } },
        comments: {
          include: { author: { select: { id: true, name: true, image: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ data: ticket })
  } catch (error) {
    console.error('[GET /api/v1/tickets/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const isApiKey = validateApiKey(req)

    if (!session?.user && !isApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session?.user && !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateTicketSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const existing = await db.supportTicket.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: Prisma.SupportTicketUpdateInput = { ...validated.data }

    // Auto-set resolvedAt when status moves to resolved/closed
    if (
      (validated.data.status === 'resolved' || validated.data.status === 'closed') &&
      !existing.resolvedAt &&
      !validated.data.resolvedAt
    ) {
      updateData.resolvedAt = new Date()
    }

    const ticket = await db.supportTicket.update({
      where: { id: params.id },
      data: updateData,
    })

    const userId = session?.user?.id ?? 'system'
    db.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        tableName: 'support_tickets',
        recordId: ticket.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        newData: JSON.parse(JSON.stringify(ticket)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] support_tickets UPDATE', e))

    return NextResponse.json({ data: ticket })
  } catch (error) {
    console.error('[PATCH /api/v1/tickets/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const isApiKey = validateApiKey(req)

    if (!session?.user && !isApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session?.user && !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.supportTicket.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.supportTicket.delete({ where: { id: params.id } })

    const userId = session?.user?.id ?? 'system'
    db.auditLog.create({
      data: {
        userId,
        action: 'DELETE',
        tableName: 'support_tickets',
        recordId: params.id,
        oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] support_tickets DELETE', e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/v1/tickets/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
