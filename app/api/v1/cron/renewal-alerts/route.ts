import { NextRequest, NextResponse } from 'next/server'
import type { AlertChannel } from '@prisma/client'
import { db } from '@/lib/db'
import { getOrCreateConnection, postMessage, resolveToken } from '@/lib/integrations/slack'
import { sendEmail } from '@/lib/email'
import { buildVariableContext, renderTemplate, type OwnerVarSource } from '@/lib/alerts/variables'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const OWNER_SELECT = {
  firstName: true, lastName: true, nickname: true, phone: true, email: true, otherEmail: true,
  address: true, city: true, state: true, postalCode: true, country: true, category: true,
  nationality: true, language: true, dateOfBirth: true, status: true, personalityScore: true,
  communicationScore: true, documentType: true, documentNumber: true,
} as const

// UTC-safe whole-day difference (matches lib/owners/documentStatus daysUntil).
function daysUntil(date: Date, today: Date): number {
  const MS = 86_400_000
  const a = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a - b) / MS)
}

// Current hour (0–23) in America/New_York.
function easternHour(now: Date): number {
  const h = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', hour12: false,
  }).format(now)
  // "24" can appear at midnight in some environments; normalize to 0.
  const n = parseInt(h, 10)
  return n === 24 ? 0 : n
}

// GET — the hourly renewal-alert sender. Vercel Cron calls this every hour; each
// alert type self-gates on its sendHour, and each (file, channel, offset) fires
// once thanks to the AlertSendLog unique key. Auth: Bearer ${CRON_SECRET}.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron renewal-alerts] CRON_SECRET is not set')
    return NextResponse.json({ error: 'Cron not configured' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const etHour = easternHour(now)
  let sent = 0
  let skipped = 0
  let errored = 0

  try {
    const alerts = await db.fileAlert.findMany({
      include: {
        alertType: true,
        folder: { select: { name: true } },
        owner: { select: OWNER_SELECT },
        unit: { select: { owner: { select: OWNER_SELECT } } },
      },
    })

    // Resolve the Slack token lazily, once, only if some alert needs it.
    let slackToken: string | null | undefined // undefined = not yet resolved

    for (const a of alerts) {
      const type = a.alertType
      if (type.sendHour !== etHour) continue
      const d = daysUntil(a.expirationDate, now)
      if (!type.leadTimeDays.includes(d)) continue

      const owner = (a.owner ?? a.unit?.owner ?? null) as OwnerVarSource | null
      const ctx = buildVariableContext(
        { owner, doc: { fileName: a.fileName, folderName: a.folder?.name ?? null, expirationDate: a.expirationDate } },
        now,
      )

      // One send per enabled channel, deduped by AlertSendLog unique key.
      const channels: AlertChannel[] = []
      if (type.notifyInternal) channels.push('slack')
      if (type.notifyOwner) channels.push('email')

      for (const channel of channels) {
        const already = await db.alertSendLog.findUnique({
          where: { fileAlertId_channel_leadDay: { fileAlertId: a.id, channel, leadDay: d } },
        })
        if (already) { skipped++; continue }

        let status: 'sent' | 'skipped' | 'error' = 'error'
        let detail = ''
        try {
          if (channel === 'slack') {
            if (!type.slackChannelId) { status = 'skipped'; detail = 'no slack channel id' }
            else {
              if (slackToken === undefined) {
                const conn = await getOrCreateConnection()
                slackToken = conn ? resolveToken(conn) : null
              }
              if (!slackToken) { status = 'skipped'; detail = 'slack not connected' }
              else {
                await postMessage(slackToken, type.slackChannelId, renderTemplate(type.slackTemplate ?? '', ctx))
                status = 'sent'; detail = `slack ${type.slackChannel ?? type.slackChannelId}`
              }
            }
          } else {
            const to = owner?.email ?? ''
            if (!to) { status = 'skipped'; detail = 'owner has no email' }
            else {
              const r = await sendEmail({
                to,
                subject: renderTemplate(type.emailSubject ?? '', ctx),
                text: renderTemplate(type.emailTemplate ?? '', ctx),
              })
              if (r.sent) { status = 'sent'; detail = `email ${to}` }
              else { status = 'skipped'; detail = 'skipped' in r ? 'smtp not configured' : r.error }
            }
          }
        } catch (err) {
          status = 'error'; detail = err instanceof Error ? err.message : 'send failed'
        }

        if (status === 'sent') sent++
        else if (status === 'error') errored++
        else skipped++

        // Record the attempt. The unique key prevents double-sends on re-runs;
        // if a concurrent run already logged it, ignore the duplicate.
        await db.alertSendLog
          .create({ data: { fileAlertId: a.id, channel, leadDay: d, status, detail } })
          .catch(() => {})
      }
    }

    return NextResponse.json({ data: { etHour, processed: alerts.length, sent, skipped, errored } })
  } catch (error) {
    console.error('[GET /api/v1/cron/renewal-alerts]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
