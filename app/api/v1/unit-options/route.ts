import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const ALLOWED_ROLES = ['super_admin', 'operations_manager', 'owner_relations']

const VALID_FIELDS = ['type', 'view', 'feature', 'bath_type', 'status'] as const

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

    const options = await db.unitFieldOption.findMany({
      where: field ? { field } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ data: options })
  } catch (error) {
    console.error('[GET /api/v1/unit-options]', error)
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

    if (!ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const { field, label } = validated.data
    const value = slugify(label) || label.slice(0, 50)

    const existing = await db.unitFieldOption.findUnique({
      where: { field_value: { field, value } },
    })

    if (existing) {
      return NextResponse.json({ data: existing })
    }

    const maxOrder = await db.unitFieldOption.aggregate({
      _max: { sortOrder: true },
      where: { field },
    })

    const option = await db.unitFieldOption.create({
      data: {
        field,
        value,
        label,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      },
    })

    return NextResponse.json({ data: option }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/unit-options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
