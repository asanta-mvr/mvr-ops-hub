import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzView, authzEdit } from '@/lib/auth/permissions'
import { caseTypeDefSchema } from '@/lib/validations/dispute'
import { listCaseTypeDefs, createCaseTypeDef } from '@/lib/disputes/caseTypes'

export async function GET() {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    return NextResponse.json({ data: await listCaseTypeDefs() })
  } catch (error) {
    console.error('[GET /api/v1/disputes/case-types]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = caseTypeDefSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const def = await createCaseTypeDef(parsed.data, session!.user.id)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'CREATE',
          tableName: 'dispute_case_type_defs',
          recordId: def.key,
          newData: JSON.parse(
            JSON.stringify({ key: def.key, label: def.label, statuses: def.statuses })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute_case_type_defs CREATE', e))

    return NextResponse.json({ data: def }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/disputes/case-types]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
