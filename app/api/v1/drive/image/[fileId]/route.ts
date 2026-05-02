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

    // Get a short-lived access token and fetch the file directly.
    // Using fetch (not googleapis binary download) avoids the arraybuffer
    // type confusion in googleapis — this is the reliable path for Node.js.
    const tokenRes = await authClient.getAccessToken()
    // getAccessToken returns string | GetAccessTokenResponse depending on version
    const token: string | null | undefined =
      typeof tokenRes === 'string'
        ? tokenRes
        : (tokenRes as unknown as { token?: string | null })?.token
    if (!token) throw new Error('Failed to obtain access token')

    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!driveRes.ok) {
      console.error('[drive-image] fileId=%s status=%d', fileId, driveRes.status)
      return new NextResponse('Image not found', { status: driveRes.status })
    }

    const contentType = driveRes.headers.get('content-type') ?? 'image/jpeg'
    const buffer = Buffer.from(await driveRes.arrayBuffer())

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=600',
        'Content-Length': String(buffer.length),
      },
    })
  } catch (err) {
    console.error('[drive-image] fileId=%s error=%o', fileId, err)
    return new NextResponse('Image not found', { status: 404 })
  }
}
