import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  // Phase 3: import Stripe and verify with stripe.webhooks.constructEvent()
  if (!secret || !signature) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  await db.webhookLog.create({
    data: {
      source: 'stripe',
      eventType: (payload.type as string) ?? 'unknown',
      payload: payload as Prisma.InputJsonValue,
      status: 'received',
    },
  })

  return NextResponse.json({ received: true })
}
