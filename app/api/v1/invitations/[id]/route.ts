import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

// DELETE /api/v1/invitations/[id] — cancel a pending invitation
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const invitation = await db.userInvitation.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        acceptedAt: true,
        permissions: true,
        expiresAt: true,
      },
    })
    if (!invitation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation already accepted; deactivate the user instead.' },
        { status: 400 }
      )
    }

    await db.userInvitation.delete({ where: { id: params.id } })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'INVITE_CANCEL',
          tableName: 'user_invitations',
          recordId: params.id,
          oldData: JSON.parse(
            JSON.stringify({
              email: invitation.email,
              expiresAt: invitation.expiresAt,
              permissions: invitation.permissions,
            })
          ) as Prisma.InputJsonValue,
          ipAddress:
            req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] user_invitations INVITE_CANCEL', e))

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[DELETE /api/v1/invitations/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
