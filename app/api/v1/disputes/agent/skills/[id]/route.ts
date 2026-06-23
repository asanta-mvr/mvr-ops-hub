import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { skillSchema } from '@/lib/validations/dispute'
import { updateSkill, deleteSkill } from '@/lib/disputes/agent'
import { DisputeError } from '@/lib/disputes/cases'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = skillSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const skill = await updateSkill(params.id, parsed.data)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_skills',
          recordId: skill.id,
          newData: JSON.parse(
            JSON.stringify({ name: skill.name, caseType: skill.caseType, ota: skill.ota, enabled: skill.enabled })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_skills UPDATE', e))

    return NextResponse.json({ data: skill })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[PATCH /api/v1/disputes/agent/skills/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    await deleteSkill(params.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'DELETE',
          tableName: 'dispute_skills',
          recordId: params.id,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_skills DELETE', e))

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[DELETE /api/v1/disputes/agent/skills/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
