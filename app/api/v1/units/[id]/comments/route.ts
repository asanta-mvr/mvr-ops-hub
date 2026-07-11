import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { canView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

const createCommentSchema = z.object({
  body: z.string().trim().min(1, 'Comment cannot be empty').max(4000),
})

// Shared select so list + create return the same shape.
const commentSelect = {
  id: true,
  body: true,
  createdAt: true,
  authorId: true,
  author: { select: { name: true, email: true } },
} as const

// GET — all comments for a unit, oldest first.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.units'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const comments = await db.unitComment.findMany({
      where: { unitId: params.id },
      select: commentSelect,
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ data: comments })
  } catch (error) {
    console.error('[GET /api/v1/units/:id/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — add a comment, attributed to the signed-in user (server-side).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canView(session, 'data_master.units'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const parsed = createCommentSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const unit = await db.unit.findUnique({ where: { id: params.id }, select: { id: true } })
    if (!unit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const comment = await db.unitComment.create({
      data: {
        unitId: params.id,
        authorId: session.user.id,
        body: parsed.data.body,
      },
      select: commentSelect,
    })

    return NextResponse.json({ data: comment }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/units/:id/comments]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
