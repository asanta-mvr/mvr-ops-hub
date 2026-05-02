import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { auth } from '@/lib/auth'

export async function GET(
  _req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const session = await auth()
  if (!session?.user) return new NextResponse('Unauthorized', { status: 401 })

  const { fileId } = params
  if (!fileId) return new NextResponse('Missing fileId', { status: 400 })

  try {
    const keyBase64 = process.env.GCS_SERVICE_ACCOUNT_KEY
    if (!keyBase64) throw new Error('GCS_SERVICE_ACCOUNT_KEY not set')

    const credentials = JSON.parse(Buffer.from(keyBase64, 'base64').toString())
    const authClient = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
    const drive = google.drive({ version: 'v3', auth: authClient })

    // Fetch metadata to get mime type
    const meta = await drive.files.get({ fileId, fields: 'mimeType' })
    const mimeType = meta.data.mimeType ?? 'image/jpeg'

    // Fetch file content as buffer
    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )
    const buffer = Buffer.from(fileRes.data as ArrayBuffer)

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=600',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[drive-image] fileId=%s error=%o', fileId, err)
    return new NextResponse('Image not found', { status: 404 })
  }
}
