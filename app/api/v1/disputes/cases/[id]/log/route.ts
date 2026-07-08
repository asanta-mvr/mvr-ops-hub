import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzView, authzEdit } from '@/lib/auth/permissions'
import { caseLogSchema } from '@/lib/validations/dispute'
import {
  appendCaseEvent,
  listCaseEvents,
  serializeCase,
  DisputeError,
} from '@/lib/disputes/cases'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    return NextResponse.json({ data: await listCaseEvents(params.id) })
  } catch (error) {
    console.error('[GET /api/v1/disputes/cases/:id/log]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = caseLogSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { updated, event } = await appendCaseEvent({
      id: params.id,
      status: parsed.data.status,
      note: parsed.data.note,
      userId: session!.user.id,
    })

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_cases',
          recordId: updated.id,
          newData: JSON.parse(
            JSON.stringify({ status: event.status, note: event.note, eventId: event.id })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute case log APPEND', e))

    return NextResponse.json({
      data: {
        case: serializeCase(updated),
        events: await listCaseEvents(params.id),
      },
    })
  } catch (error) {
    if (error instanceof DisputeError) {
      const status = error.code === 'not_found' ? 404 : 422
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('[POST /api/v1/disputes/cases/:id/log]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
