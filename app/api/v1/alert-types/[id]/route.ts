import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { alertTypeSchema } from '@/lib/validations/alerts'

// PATCH — edit a reusable alert type (name, reminder cadence, routing). Changes
// apply to every file alert that references this type.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.alertType.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Alert type not found' }, { status: 404 })

    const parsed = alertTypeSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }
    const {
      name, leadTimeDays, sendHour, notifyInternal, slackChannel, slackChannelId,
      slackTemplate, notifyOwner, emailSubject, emailTemplate,
    } = parsed.data

    const updated = await db.alertType.update({
      where: { id: params.id },
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
          action: 'UPDATE',
          tableName: 'alert_types',
          recordId: updated.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          newData: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] alert_types UPDATE', e))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PATCH /api/v1/alert-types/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — remove a reusable alert type. Refused while any file alert still uses
// it (FileAlert.alertType is restrict, not cascade) so live alerts aren't orphaned.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await db.alertType.findUnique({
      where: { id: params.id },
      include: { _count: { select: { fileAlerts: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Alert type not found' }, { status: 404 })
    if (existing._count.fileAlerts > 0) {
      return NextResponse.json(
        { error: `In use by ${existing._count.fileAlerts} file alert(s). Remove those first.` },
        { status: 409 }
      )
    }

    await db.alertType.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'DELETE',
          tableName: 'alert_types',
          recordId: params.id,
          oldData: JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch(e => console.error('[audit] alert_types DELETE', e))

    return NextResponse.json({ data: { id: params.id } })
  } catch (error) {
    console.error('[DELETE /api/v1/alert-types/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
