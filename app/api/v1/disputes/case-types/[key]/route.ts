import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { deleteCaseTypeDef } from '@/lib/disputes/caseTypes'
import { DisputeError } from '@/lib/disputes/cases'

export async function DELETE(req: NextRequest, { params }: { params: { key: string } }) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    await deleteCaseTypeDef(params.key)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'DELETE',
          tableName: 'dispute_case_type_defs',
          recordId: params.key,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_case_type_defs DELETE', e))

    return NextResponse.json({ data: { ok: true } })
  } catch (error) {
    if (error instanceof DisputeError && error.code === 'not_found') {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof DisputeError && error.code === 'conflict') {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    console.error('[DELETE /api/v1/disputes/case-types/:key]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
