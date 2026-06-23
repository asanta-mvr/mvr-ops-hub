import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzView, authzEdit } from '@/lib/auth/permissions'
import { skillSchema } from '@/lib/validations/dispute'
import { listSkills, createSkill } from '@/lib/disputes/agent'

export async function GET() {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    return NextResponse.json({ data: await listSkills() })
  } catch (error) {
    console.error('[GET /api/v1/disputes/agent/skills]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
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

    const skill = await createSkill(parsed.data, session!.user.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'CREATE',
          tableName: 'dispute_skills',
          recordId: skill.id,
          newData: JSON.parse(
            JSON.stringify({ name: skill.name, caseType: skill.caseType, ota: skill.ota })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_skills CREATE', e))

    return NextResponse.json({ data: skill }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/disputes/agent/skills]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
