import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const VALID_FIELDS = ['zone'] as const

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 50)
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const field = req.nextUrl.searchParams.get('field')

    const options = await db.buildingFieldOption.findMany({
      where: field ? { field } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ data: options })
  } catch (error) {
    console.error('[GET /api/v1/building-options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const createSchema = z.object({
  field: z.enum(VALID_FIELDS),
  label: z.string().min(1).max(100),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, 'data_master.buildings'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const validated = createSchema.safeParse(await req.json())
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { field, label } = validated.data
    const value = slugify(label) || label.slice(0, 50)

    // Idempotent on the (field, value) unique key.
    const existing = await db.buildingFieldOption.findUnique({ where: { field_value: { field, value } } })
    if (existing) return NextResponse.json({ data: existing })

    const maxOrder = await db.buildingFieldOption.aggregate({ _max: { sortOrder: true }, where: { field } })
    const option = await db.buildingFieldOption.create({
      data: { field, value, label, sortOrder: (maxOrder._max.sortOrder ?? 0) + 1 },
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'CREATE',
          tableName: 'building_field_options',
          recordId: option.id,
          newData: JSON.parse(JSON.stringify(option)) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] building_field_options CREATE', e))

    return NextResponse.json({ data: option }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/building-options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
