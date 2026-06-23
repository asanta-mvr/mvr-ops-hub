import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { restoreVersion, deleteVersion } from '@/lib/disputes/agent'
import { DisputeError } from '@/lib/disputes/cases'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const restored = await restoreVersion(params.id, session!.user.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'UPDATE',
          tableName: 'dispute_agent_config',
          recordId: 'default',
          newData: JSON.parse(JSON.stringify({ restoredFrom: params.id })) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_agent_config RESTORE', e))

    return NextResponse.json({ data: restored })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[POST /api/v1/disputes/agent/versions/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    await deleteVersion(params.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'DELETE',
          tableName: 'dispute_agent_versions',
          recordId: params.id,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_agent_versions DELETE', e))

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('[DELETE /api/v1/disputes/agent/versions/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
