import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canView, canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { inviteUserSchema } from '@/lib/auth/schemas'
import { sendInvitationEmail, type InvitationPermission } from '@/lib/email'

export const dynamic = 'force-dynamic'

const INVITATION_TTL_DAYS = 7

function generateToken(): string {
  return randomBytes(32).toString('base64url')
}

function inviterDisplay(user: { name: string | null; email: string }): string {
  return user.name?.trim() || user.email
}

// POST /api/v1/invitations — create + send invitation
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await canEdit(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const parsed = inviteUserSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { email, name, permissions, message } = parsed.data

    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists. Edit their permissions instead.' },
        { status: 409 }
      )
    }

    await db.userInvitation.deleteMany({
      where: { email, acceptedAt: null },
    })

    const inviter = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    })
    if (!inviter) {
      return NextResponse.json({ error: 'Inviter not found' }, { status: 500 })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)

    const invitation = await db.userInvitation.create({
      data: {
        email,
        name: name ?? null,
        token,
        permissions: permissions as unknown as Prisma.InputJsonValue,
        invitedBy: session.user.id,
        expiresAt,
      },
      select: { id: true, email: true, expiresAt: true },
    })

    const emailResult = await sendInvitationEmail({
      to: email,
      name: name ?? null,
      token,
      inviterName: inviterDisplay(inviter),
      inviterEmail: inviter.email,
      message: message ?? null,
      permissions: permissions as InvitationPermission[],
      expiresAt,
    })

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'INVITE_CREATE',
          tableName: 'user_invitations',
          recordId: invitation.id,
          newData: JSON.parse(
            JSON.stringify({ email, name, permissions, message, expiresAt })
          ) as Prisma.InputJsonValue,
          ipAddress:
            req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] user_invitations INVITE_CREATE', e))

    const emailSent = 'sent' in emailResult ? emailResult.sent : false
    const emailError =
      'error' in emailResult
        ? emailResult.error
        : 'skipped' in emailResult
          ? 'SMTP not configured — invitation created but no email sent.'
          : null

    return NextResponse.json({
      data: {
        id: invitation.id,
        email: invitation.email,
        expiresAt: invitation.expiresAt.toISOString(),
        emailSent,
        emailError,
      },
    })
  } catch (error) {
    console.error('[POST /api/v1/invitations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/v1/invitations — list pending (unaccepted, unexpired) invitations
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await canView(session, 'settings.users'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const rows = await db.userInvitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        invitedBy: true,
        expiresAt: true,
        createdAt: true,
        permissions: true,
      },
    })

    const inviterIds = Array.from(new Set(rows.map((r) => r.invitedBy)))
    const inviters = inviterIds.length
      ? await db.user.findMany({
          where: { id: { in: inviterIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const inviterMap = new Map(inviters.map((u) => [u.id, u] as const))

    const data = rows.map((r) => {
      const inviter = inviterMap.get(r.invitedBy)
      const permsArr = Array.isArray(r.permissions) ? (r.permissions as unknown[]) : []
      return {
        id: r.id,
        email: r.email,
        name: r.name,
        invitedBy: r.invitedBy,
        invitedByName: inviter?.name ?? inviter?.email ?? 'Unknown',
        invitedByEmail: inviter?.email ?? null,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        permissionCount: permsArr.length,
      }
    })

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[GET /api/v1/invitations]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
