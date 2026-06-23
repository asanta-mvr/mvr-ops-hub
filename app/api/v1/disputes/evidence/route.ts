import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { authzEdit } from '@/lib/auth/permissions'
import { uploadFile, getGcsPath } from '@/lib/storage/gcs'

const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4 MB (Vercel function payload ceiling)

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

function sanitizeName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120)
  return cleaned || 'evidence'
}

function sanitizeDraftId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40)
  return cleaned || null
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    const authz = await authzEdit(session, 'customer_success.dispute_tool')
    if (!authz.ok) return NextResponse.json({ error: authz.message }, { status: authz.status })

    const formData = await req.formData()
    const file = formData.get('file')
    const draftId = sanitizeDraftId(formData.get('draftId'))

    if (!draftId) {
      return NextResponse.json({ error: 'A draftId is required' }, { status: 400 })
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 4 MB limit' }, { status: 413 })
    }
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not allowed` },
        { status: 415 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    // Namespace the object under the authenticated uploader's id so /analyze can
    // enforce ownership (`disputes/<userId>/<draftId>/<file>`). The userId comes
    // from the session, never the client — this is the IDOR guard's anchor.
    const path = getGcsPath(
      'disputes',
      `${session!.user.id}/${draftId}`,
      `${Date.now()}-${sanitizeName(file.name)}`
    )
    const previewUrl = await uploadFile(buffer, path, file.type)

    db.auditLog
      .create({
        data: {
          userId: session!.user.id,
          action: 'CREATE',
          tableName: 'dispute_evidence',
          recordId: path,
          newData: JSON.parse(
            JSON.stringify({ draftId, fileName: file.name, size: file.size, contentType: file.type })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] dispute evidence upload', e))

    return NextResponse.json({ data: { path, previewUrl } }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/v1/disputes/evidence]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
