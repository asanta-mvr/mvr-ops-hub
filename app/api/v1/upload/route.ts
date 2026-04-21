import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { uploadToDrive } from '@/lib/integrations/google-drive'
import { uploadParamsSchema } from '@/lib/validations/upload'

// Vercel Serverless Function payload limit is ~4.5 MB — keep this under that.
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file     = formData.get('file')
    const folder   = formData.get('folder')
    const name     = formData.get('name')

    const params = uploadParamsSchema.safeParse({
      folder,
      name: typeof name === 'string' && name ? name : undefined,
    })
    if (!params.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: params.error.flatten() },
        { status: 400 }
      )
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds the 4 MB limit' },
        { status: 413 }
      )
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 415 }
      )
    }

    const buffer   = Buffer.from(await file.arrayBuffer())
    const fileName = params.data.name ?? file.name
    const result   = await uploadToDrive(buffer, fileName, file.type, params.data.folder)

    db.auditLog.create({
      data: {
        userId:    session.user.id,
        action:    'CREATE',
        tableName: 'drive_uploads',
        recordId:  result.fileId,
        newData:   JSON.parse(JSON.stringify({ folder: params.data.folder, fileName, size: result.size })) as Prisma.InputJsonValue,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
        userAgent: req.headers.get('user-agent') ?? undefined,
      },
    }).catch((e) => console.error('[audit] drive upload', e))

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/upload]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
