import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView, canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { alertTypeSchema } from '@/lib/validations/alerts'

export const dynamic = 'force-dynamic'

// GET — list reusable alert types (global) for the Renewal Alerts picker.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await canView(session, 'data_master.owners'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const types = await db.alertType.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json({ data: types })
}

// POST — create a reusable alert type. Routes to internal (Slack channel) and/or
// external (the owner's email); at least one must be enabled (enforced by Zod).
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = alertTypeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const {
      name, leadTimeDays, sendHour, notifyInternal, slackChannel, slackChannelId,
      slackTemplate, notifyOwner, emailSubject, emailTemplate,
    } = parsed.data

    const type = await db.alertType.create({
      data: {
        name,
        leadTimeDays,
        sendHour,
        notifyInternal,
        slackChannel: notifyInternal ? (slackChannel ?? null) : null,
        slackChannelId: notifyInternal ? (slackChannelId ?? null) : null,
        slackTemplate: notifyInternal ? (slackTemplate ?? null) : null,
        notifyOwner,
        emailSubject: notifyOwner ? (emailSubject ?? null) : null,
        emailTemplate: notifyOwner ? (emailTemplate ?? null) : null,
      },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'alert_types',
          recordId: type.id,
          newData: JSON.parse(JSON.stringify(type)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] alert_types CREATE', e))

    return NextResponse.json({ data: type }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/alert-types]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
