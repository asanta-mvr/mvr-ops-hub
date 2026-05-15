import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit, canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { ruleInputSchema } from '@/lib/risk/schemas'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'customer_success.chargebacks_rules'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rules = await db.notificationRule.findMany({
      orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }],
      include: { createdBy: { select: { name: true, email: true } } },
    })

    return NextResponse.json({ data: rules })
  } catch (error) {
    console.error('[GET /api/v1/risk/rules]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'customer_success.chargebacks_rules'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = ruleInputSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const rule = await db.notificationRule.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description,
        criteria: parsed.data.criteria as Prisma.InputJsonValue,
        channel: parsed.data.channel,
        priority: parsed.data.priority,
        enabled: parsed.data.enabled,
        createdById: session.user.id,
      },
      include: { createdBy: { select: { name: true, email: true } } },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'notification_rules',
          recordId: rule.id,
          newData: JSON.parse(JSON.stringify(rule)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] rules CREATE', e))

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/risk/rules]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
