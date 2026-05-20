import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { sendInvitationEmail, type InvitationPermission } from '@/lib/email'
import { isResource, type Level } from '@/lib/auth/resources'

export const dynamic = 'force-dynamic'

const INVITATION_TTL_DAYS = 7

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

function inviterDisplay(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email
}

// POST /api/v1/invitations/[id]/resend — rotate token, extend expiration, resend email
export async function POST(
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
        name: true,
        permissions: true,
        acceptedAt: true,
      },
    })
    if (!invitation) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation already accepted; cannot resend.' },
        { status: 400 }
      )
    }

    const inviter = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })
    if (!inviter) {
      return NextResponse.json({ error: 'Inviter not found' }, { status: 500 })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)

    await db.userInvitation.update({
      where: { id: invitation.id },
      data: { token, expiresAt },
    })

    const stored =
      (invitation.permissions as Array<{ resource: string; level: Level }> | null) ?? []
    const permissions: InvitationPermission[] = stored
      .filter((p) => isResource(p.resource) && (p.level === 'view' || p.level === 'edit'))
      .map((p) => ({
        resource: p.resource as InvitationPermission['resource'],
        level: p.level,
      }))

    const emailResult = await sendInvitationEmail({
      to: invitation.email,
      name: invitation.name,
      token,
      inviterName: inviterDisplay(inviter),
      inviterEmail: inviter.email,
      message: null,
      permissions,
      expiresAt,
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'INVITE_RESEND',
          tableName: 'user_invitations',
          recordId: invitation.id,
          newData: JSON.parse(JSON.stringify({ expiresAt })) as Prisma.InputJsonValue,
          ipAddress:
            req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] user_invitations INVITE_RESEND', e))

    const emailSent = 'sent' in emailResult ? emailResult.sent : false
    const emailError =
      'error' in emailResult
        ? emailResult.error
        : 'skipped' in emailResult
          ? 'SMTP not configured — invitation updated but no email sent.'
          : null

    return NextResponse.json({
      data: {
        id: invitation.id,
        expiresAt: expiresAt.toISOString(),
        emailSent,
        emailError,
      },
    })
  } catch (error) {
    console.error('[POST /api/v1/invitations/:id/resend]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
