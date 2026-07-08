import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const FIELDS = ['type', 'category', 'language'] as const

const createSchema = z.object({
  field: z.enum(FIELDS),
  label: z.string().min(1).max(60),
})

// GET — list user-extensible dropdown options, optionally filtered by field.
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const field = req.nextUrl.searchParams.get('field')
    const options = await db.ownerFieldOption.findMany({
      where: field ? { field } : {},
      orderBy: [{ field: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    })
    return NextResponse.json({ data: options })
  } catch (error) {
    console.error('[GET /api/v1/owners/field-options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — add a new option (e.g. a new owner type / category / language). Idempotent
// on (field, value) so re-adding an existing label just returns it.
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = createSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    const value = parsed.data.label.trim()
    const option = await db.ownerFieldOption.upsert({
      where: { field_value: { field: parsed.data.field, value } },
      update: {},
      create: { field: parsed.data.field, value, label: value },
    })
    return NextResponse.json({ data: option }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/owners/field-options]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
