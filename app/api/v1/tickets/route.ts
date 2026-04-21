import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth, validateApiKey } from '@/lib/auth'
import { db } from '@/lib/db'
import { createTicketSchema } from '@/lib/validations/tickets'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'cx_agent']

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const unitId = searchParams.get('unitId')
    const buildingId = searchParams.get('buildingId')
    const assignedToId = searchParams.get('assignedToId')

    const tickets = await db.supportTicket.findMany({
      where: {
        ...(status ? { status: status as Prisma.EnumTicketStatusFilter } : {}),
        ...(source ? { source: source as Prisma.EnumOtaSourceFilter } : {}),
        ...(unitId ? { unitId } : {}),
        ...(buildingId ? { buildingId } : {}),
        ...(assignedToId ? { assignedToId } : {}),
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        unit: { select: { id: true, number: true } },
        building: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: tickets })
  } catch (error) {
    console.error('[GET /api/v1/tickets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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
    const validated = createTicketSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { source, confirmationCode } = validated.data

    // Dedup: if source + confirmationCode already exists, return the existing ticket
    if (confirmationCode) {
      const existing = await db.supportTicket.findUnique({
        where: { source_confirmationCode: { source, confirmationCode } },
        include: { comments: { orderBy: { createdAt: 'asc' } } },
      })
      if (existing) {
        return NextResponse.json({ data: existing, created: false })
      }
    }

    const { checkinDate, checkoutDate, ...rest } = validated.data
    const ticket = await db.supportTicket.create({
      data: {
        ...rest,
        ...(checkinDate  ? { checkinDate:  new Date(checkinDate) }  : {}),
        ...(checkoutDate ? { checkoutDate: new Date(checkoutDate) } : {}),
      },
    })

    const userId = session?.user?.id ?? 'system'
    db.auditLog.create({
      data: {
        userId,
        action: 'CREATE',
        tableName: 'support_tickets',
        recordId: ticket.id,
        newData: JSON.parse(JSON.stringify(ticket)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] support_tickets CREATE', e))

    return NextResponse.json({ data: ticket, created: true }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/tickets]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
