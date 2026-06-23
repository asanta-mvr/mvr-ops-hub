import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzView, authzEdit } from '@/lib/auth/permissions'
import { agentConfigSchema } from '@/lib/validations/dispute'
import { getAgentConfigRecord, updateAgentConfig } from '@/lib/disputes/agent'

export async function GET() {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    return NextResponse.json({ data: await getAgentConfigRecord() })
  } catch (error) {
    console.error('[GET /api/v1/disputes/agent]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = agentConfigSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updated = await updateAgentConfig({ ...parsed.data, userId: session!.user.id })

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_agent_config',
          recordId: 'default',
          newData: JSON.parse(
            JSON.stringify({ agentName: updated.agentName, guardrails: updated.guardrails })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_agent_config UPDATE', e))

    return NextResponse.json({ data: updated })
  } catch (error) {
    console.error('[PATCH /api/v1/disputes/agent]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
