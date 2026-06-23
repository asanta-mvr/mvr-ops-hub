import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { updateCaseStatusSchema } from '@/lib/validations/dispute'
import { resolveCase, serializeCase, DisputeError } from '@/lib/disputes/cases'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = updateCaseStatusSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { updated, previous } = await resolveCase({
      id: params.id,
      status: parsed.data.status,
      outcomeNote: parsed.data.outcomeNote,
      userId: session!.user.id,
    })

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_cases',
          recordId: updated.id,
          oldData: JSON.parse(
            JSON.stringify({ status: previous.status, outcomeNote: previous.outcomeNote })
          ) as Prisma.InputJsonValue,
          newData: JSON.parse(
            JSON.stringify({ status: updated.status, outcomeNote: updated.outcomeNote })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute case status UPDATE', e))

    return NextResponse.json({ data: serializeCase(updated) })
  } catch (error) {
    if (error instanceof DisputeError) {
      const status = error.code === 'not_found' ? 404 : 422
      return NextResponse.json({ error: error.message }, { status })
    }
    console.error('[PATCH /api/v1/disputes/cases/:id/status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
