import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { knowledgeSchema } from '@/lib/validations/dispute'
import { updateKnowledge, deleteKnowledge } from '@/lib/disputes/knowledge'
import { DisputeError } from '@/lib/disputes/cases'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = knowledgeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const entry = await updateKnowledge(params.id, parsed.data, session!.user.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_knowledge',
          recordId: entry.id,
          newData: JSON.parse(
            JSON.stringify({ title: entry.title, ota: entry.ota, caseType: entry.caseType, enabled: entry.enabled })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_knowledge UPDATE', e))

    return NextResponse.json({ data: entry })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[PATCH /api/v1/disputes/knowledge/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    await deleteKnowledge(params.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'DELETE',
          tableName: 'dispute_knowledge',
          recordId: params.id,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_knowledge DELETE', e))

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[DELETE /api/v1/disputes/knowledge/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
