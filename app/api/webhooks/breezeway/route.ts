import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { verifyHmacSignature } from '@/lib/utils/webhooks'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-breezeway-signature') ?? ''
  const secret = process.env.BREEZEWAY_WEBHOOK_SECRET ?? ''

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
      source: 'breezeway',
      eventType: (payload.event as string) ?? 'unknown',
      payload: payload as Prisma.InputJsonValue,
      status: 'received',
    },
  })

  processBreezewayWebhook(payload).catch((err) =>
    console.error('[Breezeway webhook] Processing error:', err)
  )

  return NextResponse.json({ received: true })
}

async function processBreezewayWebhook(payload: Record<string, unknown>): Promise<void> {
  // Phase 4: implement task sync, property updates, etc.
  console.log('[Breezeway webhook] Event received:', payload.event)
}
