import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { riskDb } from '@/lib/db/risk'
import { notifyPayloadSchema } from '@/lib/risk/schemas'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'customer_success.chargebacks'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = notifyPayloadSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const webhookUrl = process.env.N8N_NOTIFICATION_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'N8N_NOTIFICATION_WEBHOOK_URL is not configured. Set it in your environment.' },
        { status: 503 }
      )
    }

    const disputeIds = parsed.data.disputeIds ?? []
    const chargeIds = parsed.data.chargeIds ?? []

    // Hydrate from the risk DB so n8n can build a rich Slack message.
    const [disputes, charges] = await Promise.all([
      disputeIds.length > 0
        ? riskDb.riskDispute.findMany({
            where: { id: { in: disputeIds } },
            include: { transaction: { select: { customerId: true, bookingId: true, riskLevel: true } } },
          })
        : Promise.resolve([]),
      chargeIds.length > 0
        ? riskDb.riskTransaction.findMany({
            where: { id: { in: chargeIds } },
            select: {
              id: true,
              customerId: true,
              bookingId: true,
              amountCents: true,
              currency: true,
              status: true,
              riskLevel: true,
              riskScore: true,
              outcomeReason: true,
              livemode: true,
              createdAt: true,
              raw: true,
            },
          })
        : Promise.resolve([]),
    ])

    if (disputes.length === 0 && charges.length === 0) {
      return NextResponse.json({ error: 'No matching disputes or charges found' }, { status: 404 })
    }

    const subject = disputes.length > 0 && charges.length === 0
      ? 'dispute'
      : charges.length > 0 && disputes.length === 0
        ? 'charge'
        : 'mixed'

    const payload = {
      source: 'mvr-ops-hub',
      event: 'manual_alert' as const,
      subject,
      channel: parsed.data.channel,
      priority: parsed.data.priority,
      message: parsed.data.message ?? null,
      ruleId: parsed.data.ruleId ?? null,
      actor: { userId: session.user.id, email: session.user.email },
      disputes: disputes.map((d) => ({
        id: d.id,
        reason: d.reason,
        amountCents: d.amountCents,
        currency: d.currency,
        status: d.status,
        recommendation: d.recommendation,
        confidence: d.confidence,
        chargeId: d.chargeId,
        customerId: d.transaction?.customerId ?? null,
        bookingId: d.transaction?.bookingId ?? null,
        riskLevel: d.transaction?.riskLevel ?? null,
      })),
      charges: charges.map((c) => ({
        id: c.id,
        amountCents: c.amountCents,
        currency: c.currency,
        status: c.status,
        riskLevel: c.riskLevel,
        riskScore: c.riskScore,
        outcomeReason: c.outcomeReason,
        customerId: c.customerId,
        bookingId: c.bookingId,
        livemode: c.livemode,
        createdAt: c.createdAt.toISOString(),
      })),
      sentAt: new Date().toISOString(),
    }

    const secret = process.env.N8N_WEBHOOK_SIGNING_SECRET ?? ''
    const bodyString = JSON.stringify(payload)
    const signature = secret
      ? createHmac('sha256', secret).update(bodyString).digest('hex')
      : ''

    const headers: Record<string, string> = { 'content-type': 'application/json' }
    if (signature) headers['x-mvr-signature'] = `sha256=${signature}`

    let webhookOk = false
    let webhookError: string | null = null
    try {
      const resp = await fetch(webhookUrl, { method: 'POST', headers, body: bodyString })
      webhookOk = resp.ok
      if (!resp.ok) webhookError = `n8n returned ${resp.status}`
    } catch (e) {
      webhookError = e instanceof Error ? e.message : 'unknown fetch error'
    }

    db.auditLog
      .create({
        data: {
          userId: session.user.id,
          action: 'NOTIFY',
          tableName: subject === 'dispute' ? 'risk_agent.disputes' : 'risk_agent.transactions',
          recordId: null,
          newData: JSON.parse(
            JSON.stringify({
              disputeIds,
              chargeIds,
              channel: parsed.data.channel,
              priority: parsed.data.priority,
              ruleId: parsed.data.ruleId ?? null,
              webhookOk,
              webhookError,
            })
          ) as Prisma.InputJsonValue,
          ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
          userAgent: req.headers.get('user-agent') ?? undefined,
        },
      })
      .catch((e) => console.error('[audit] risk NOTIFY', e))

    if (!webhookOk) {
      return NextResponse.json(
        { error: 'Webhook delivery failed', detail: webhookError },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        data: {
          queued: disputes.length + charges.length,
          subject,
          channel: parsed.data.channel,
        },
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('[POST /api/v1/risk/notify]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
