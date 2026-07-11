import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

// DELETE — remove a comment. Only its author or a super admin may delete it.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; commentId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const comment = await db.unitComment.findUnique({
      where: { id: params.commentId },
      select: { id: true, unitId: true, authorId: true },
    })
    if (!comment || comment.unitId !== params.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isAuthor = comment.authorId === session.user.id
    if (!isAuthor && !isSuperAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await db.unitComment.delete({ where: { id: params.commentId } })

    return NextResponse.json({ data: { id: params.commentId, deleted: true } })
  } catch (error) {
    console.error('[DELETE /api/v1/units/:id/comments/:commentId]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
