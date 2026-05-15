import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { ruleInputSchema } from '@/lib/risk/schemas'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'customer_success.chargebacks_rules'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.notificationRule.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const parsed = ruleInputSchema.partial().safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await db.notificationRule.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.criteria !== undefined
          ? { criteria: parsed.data.criteria as Prisma.InputJsonValue }
          : {}),
        ...(parsed.data.channel !== undefined ? { channel: parsed.data.channel } : {}),
        ...(parsed.data.priority !== undefined ? { priority: parsed.data.priority } : {}),
        ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'UPDATE',
          tableName: 'notification_rules',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] rules UPDATE', e))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PATCH /api/v1/risk/rules/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'customer_success.chargebacks_rules'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.notificationRule.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await db.notificationRule.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'notification_rules',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] rules DELETE', e))

    return NextResponse.json({ data: { id: params.id, deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/risk/rules/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
