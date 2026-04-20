import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { verifyHmacSignature } from '@/lib/utils/webhooks'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-guesty-signature') ?? ''
  const secret = process.env.GUESTY_WEBHOOK_SECRET ?? ''

  if (secret && !verifyHmacSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  await db.webhookLog.create({
    data: {
      source: 'guesty',
      eventType: (payload.event as string) ?? 'unknown',
      payload: payload as Prisma.InputJsonValue,
      status: 'received',
    },
  })

  processGuestyWebhook(payload).catch((err) =>
    console.error('[Guesty webhook] Processing error:', err)
  )

  return NextResponse.json({ received: true })
}

async function processGuestyWebhook(payload: Record<string, unknown>): Promise<void> {
  // Phase 2: implement reservation sync, listing updates, owner sync, etc.
  console.log('[Guesty webhook] Event received:', payload.event)
}
