import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzView, authzEdit } from '@/lib/auth/permissions'
import { createCaseSchema } from '@/lib/validations/dispute'
import { createCase, listCases, serializeCase } from '@/lib/disputes/cases'
import {
  DISPUTE_CASE_TYPES,
  DISPUTE_OTAS,
  DISPUTE_STATUSES,
  type DisputeCaseStatusT,
  type DisputeCaseTypeT,
  type DisputeOta,
} from '@/lib/disputes/types'

// Parses a CSV query param into the subset of `allowed` values present.
function parseCsv<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  if (!value) return []
  const set = new Set<string>(allowed)
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is T => set.has(s))
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzView(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const { searchParams } = new URL(req.url)
    const cases = await listCases({
      status: parseCsv<DisputeCaseStatusT>(searchParams.get('status'), DISPUTE_STATUSES),
      ota: parseCsv<DisputeOta>(searchParams.get('ota'), DISPUTE_OTAS),
      caseType: parseCsv<DisputeCaseTypeT>(searchParams.get('caseType'), DISPUTE_CASE_TYPES),
    })

    return NextResponse.json({ data: cases })
  } catch (error) {
    console.error('[GET /api/v1/disputes/cases]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const body = await req.json()
    const parsed = createCaseSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const created = await createCase({ ...parsed.data, createdById: session!.user.id })

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'CREATE',
          tableName: 'dispute_cases',
          recordId: created.id,
          newData: JSON.parse(
            JSON.stringify({ caseType: created.caseType, ota: created.ota, status: created.status })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute case CREATE', e))

    return NextResponse.json({ data: serializeCase(created) }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/disputes/cases]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
