import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { createOwnerSchema } from '@/lib/validations/owner'

// Generate a short 8-char hex owner id (e.g. "40fb63a9"), retrying on the rare
// collision. Falls back to a longer id if 10 attempts somehow all collide.
async function generateOwnerId(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const id = randomBytes(4).toString('hex')
    const exists = await db.owner.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return id
  }
  return randomBytes(6).toString('hex')
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    const owners = await db.owner.findMany({
      where: {
        ...(status ? { status: status as 'active' | 'inactive' | 'churned' } : {}),
        ...(search
          ? {
              OR: [
                { nickname: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { id: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { _count: { select: { units: true } } },
      orderBy: { nickname: 'asc' },
    })

    return NextResponse.json({ data: owners })
  } catch (error) {
    console.error('[GET /api/v1/owners]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await canEdit(session, "data_master.owners"))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createOwnerSchema.safeParse(body)

    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.flatten() },
        { status: 400 }
      )
    }

    const nickname = [validated.data.firstName, validated.data.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
    const id = await generateOwnerId()
    const owner = await db.owner.create({ data: { ...validated.data, id, nickname } })

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        tableName: 'owners',
        recordId: owner.id,
        newData: JSON.parse(JSON.stringify(owner)) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    })

    return NextResponse.json({ data: owner }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/owners]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
