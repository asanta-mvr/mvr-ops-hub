import { NextRequest, NextResponse } from 'next/server'
import { htmlToPdf } from '@/lib/integrations/pdf'

// GET /api/v1/reviews/weekly-brief?token=…
//
// Token-gated endpoint that renders the Reviews weekly brief preview page
// to PDF using puppeteer-core + @sparticuz/chromium. Called by n8n every
// Monday at 8 AM ET to post the brief to Slack.
//
// The token is checked in TWO places (here and on the preview page) so
// neither can be bypassed by hitting the other directly.

export const dynamic     = 'force-dynamic'
export const runtime     = 'nodejs'        // chromium binary is Linux + Node-native
export const maxDuration = 60              // puppeteer cold start ~3-5s; buffer

export async function GET(req: NextRequest) {
  try {
    const expected = process.env.WEEKLY_BRIEF_TOKEN
    if (!expected) {
      return NextResponse.json({ error: 'PDF endpoint not configured' }, { status: 503 })
    }

    const token = req.nextUrl.searchParams.get('token') ?? req.headers.get('x-internal-token')
    if (token !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const previewUrl = new URL('/internal/reviews/weekly-brief', req.nextUrl.origin)
    previewUrl.searchParams.set('token', expected)

    const pdf = await htmlToPdf(previewUrl.toString())

    // Copy into a fresh ArrayBuffer so BodyInit narrows correctly — puppeteer
    // returns a Uint8Array<ArrayBufferLike> whose generic doesn't satisfy
    // BlobPart in newer @types/node.
    const ab = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer
    const today = new Date().toISOString().slice(0, 10)
    return new NextResponse(ab, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="reviews-brief-${today}.pdf"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (error) {
    console.error('[GET /api/v1/reviews/weekly-brief]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    )
  }
}
