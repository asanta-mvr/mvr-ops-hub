import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { auth } from '@/lib/auth'
import { isSuperAdmin } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

// GET /api/v1/admin/smtp-diagnose
// Reports SMTP env config (without leaking the password value) and attempts
// a self-test email. Returns Gmail's verbatim error so we can pinpoint why
// authentication fails. Super_admin only.
export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden — super_admin only' }, { status: 403 })
  }

  const host = process.env.SMTP_HOST?.trim()
  const portRaw = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const passwordRaw = process.env.SMTP_PASSWORD ?? ''
  const password = passwordRaw.trim()
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'MVR-OS'

  const diagnosis = {
    SMTP_HOST: host || null,
    SMTP_PORT: portRaw || null,
    SMTP_USER: user || null,
    SMTP_PASSWORD_present: password.length > 0,
    SMTP_PASSWORD_length: password.length, // expect 16 for a Gmail App Password
    SMTP_PASSWORD_has_spaces: /\s/.test(passwordRaw),
    SMTP_PASSWORD_has_quotes: /^['"]|['"]$/.test(passwordRaw),
    SMTP_PASSWORD_trailing_whitespace: passwordRaw !== password,
    SMTP_FROM_NAME: fromName,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    sessionUserEmail: session.user.email ?? null,
    SMTP_USER_matches_session: user === session.user.email,
  }

  if (!host || !portRaw || !user || !password) {
    return NextResponse.json({
      ok: false,
      stage: 'config',
      message:
        'One or more SMTP_* env vars are missing — restart the dev server after editing .env.local',
      diagnosis,
    })
  }

  const port = Number.parseInt(portRaw, 10)
  if (!Number.isFinite(port)) {
    return NextResponse.json({
      ok: false,
      stage: 'config',
      message: `SMTP_PORT is not a number: "${portRaw}"`,
      diagnosis,
    })
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass: password },
    })

    await transporter.verify()

    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: session.user.email!,
      subject: 'MVR-OS · SMTP self-test',
      text: `If you can read this, Gmail SMTP is working.\n\nDiagnosis:\n${JSON.stringify(
        diagnosis,
        null,
        2
      )}`,
      html: `<p>If you can read this, Gmail SMTP is working.</p><pre style="font-size:12px;background:#f5f1eb;padding:12px;border-radius:8px">${JSON.stringify(
        diagnosis,
        null,
        2
      )}</pre>`,
    })

    return NextResponse.json({
      ok: true,
      stage: 'sent',
      message: `Test email sent to ${session.user.email}`,
      messageId: info.messageId,
      diagnosis,
    })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code ?? null
    const responseCode = (err as { responseCode?: number })?.responseCode ?? null
    const command = (err as { command?: string })?.command ?? null
    return NextResponse.json({
      ok: false,
      stage: 'smtp',
      message: error,
      smtpCode: code,
      smtpResponseCode: responseCode,
      smtpCommand: command,
      diagnosis,
    })
  }
}
