import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { canEdit } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import { getOrCreateConnection, postMessage, resolveToken } from '@/lib/integrations/slack'
import { sendEmail } from '@/lib/email'
import { buildVariableContext, renderTemplate } from '@/lib/alerts/variables'
import { testSendSchema } from '@/lib/validations/alerts'

export const dynamic = 'force-dynamic'

const OWNER_SELECT = {
  firstName: true, lastName: true, nickname: true, phone: true, email: true, otherEmail: true,
  address: true, city: true, state: true, postalCode: true, country: true, category: true,
  nationality: true, language: true, dateOfBirth: true, status: true, personalityScore: true,
  communicationScore: true, documentType: true, documentNumber: true,
} as const

// POST — render this alert type's message with a REAL owner's data and deliver it
// to the configured Slack channel and/or the owner's email, so the user can see
// exactly what will arrive. Doc variables use sample values (a test isn't tied to
// a real file). Messages are prefixed [TEST].
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!(await canEdit(session, 'data_master.owners'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const type = await db.alertType.findUnique({ where: { id: params.id } })
    if (!type) return NextResponse.json({ error: 'Alert type not found' }, { status: 404 })

    const parsed = testSendSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
    }

    // Resolve the owner from the current entity (owner directly, or a unit's owner).
    let owner: Record<string, unknown> | null = null
    if (parsed.data.ownerId) {
      owner = await db.owner.findUnique({ where: { id: parsed.data.ownerId }, select: OWNER_SELECT })
    } else if (parsed.data.unitId) {
      const unit = await db.unit.findUnique({
        where: { id: parsed.data.unitId },
        select: { owner: { select: OWNER_SELECT } },
      })
      owner = unit?.owner ?? null
    }
    if (!owner) {
      return NextResponse.json({ error: 'No owner is linked to this record — cannot render a test.' }, { status: 400 })
    }

    // Sample document context (a test isn't attached to a real file).
    const sampleExpiry = new Date(Date.now() + 30 * 86_400_000)
    const ctx = buildVariableContext({
      owner,
      doc: { fileName: 'Example document.pdf', folderName: 'Documents', expirationDate: sampleExpiry },
    })

    const results: { slack?: { sent: boolean; detail: string }; email?: { sent: boolean; detail: string } } = {}

    // Internal → Slack
    if (type.notifyInternal) {
      if (!type.slackChannelId) {
        results.slack = { sent: false, detail: 'No Slack channel ID configured on this alert type.' }
      } else {
        const connection = await getOrCreateConnection()
        if (!connection) {
          results.slack = { sent: false, detail: 'Slack is not connected.' }
        } else {
          const text = `[TEST] ${renderTemplate(type.slackTemplate ?? '', ctx)}`
          try {
            await postMessage(resolveToken(connection), type.slackChannelId, text)
            results.slack = { sent: true, detail: `Sent to ${type.slackChannel ?? type.slackChannelId}` }
          } catch (err) {
            results.slack = { sent: false, detail: err instanceof Error ? err.message : 'Slack send failed' }
          }
        }
      }
    }

    // External → owner email
    if (type.notifyOwner) {
      const to = typeof owner.email === 'string' ? owner.email : ''
      if (!to) {
        results.email = { sent: false, detail: 'This owner has no email on file.' }
      } else {
        const subject = `[TEST] ${renderTemplate(type.emailSubject ?? '', ctx)}`
        const body = renderTemplate(type.emailTemplate ?? '', ctx)
        const r = await sendEmail({ to, subject, text: body })
        results.email = r.sent
          ? { sent: true, detail: `Sent to ${to}` }
          : { sent: false, detail: 'skipped' in r ? 'SMTP is not configured.' : r.error }
      }
    }

    return NextResponse.json({ data: results })
  } catch (error) {
    console.error('[POST /api/v1/alert-types/:id/test]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
