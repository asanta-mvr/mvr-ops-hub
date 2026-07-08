// Email transport for invitation emails. Uses Gmail SMTP with an App Password
// (see .env.example for setup steps). The transporter is lazy-created on the
// first send so a missing/incomplete SMTP config does not crash the app at
// boot; instead, `sendInvitationEmail` reports `{ skipped: true }` and the
// caller decides how to surface it.
import { readFileSync } from 'fs'
import path from 'path'
import nodemailer, { type Transporter } from 'nodemailer'
import { renderInvitationEmail } from './templates/invitation'
import type { Level, Resource } from '@/lib/auth/resources'

const LOGO_CID = 'mvr-crown-logo'

// Cache the PNG bytes once per process. The file lives at /public/mvr-crown-logo.png
// in the repo; Vercel includes /public in the function bundle so the read works
// in production as well as local dev. If the file is missing (shouldn't happen),
// we still send the email — recipients will see the alt text instead of the logo.
let cachedLogoBuffer: Buffer | null = null
function loadLogoBuffer(): Buffer | null {
  if (cachedLogoBuffer) return cachedLogoBuffer
  try {
    const filePath = path.join(process.cwd(), 'public', 'mvr-crown-logo.png')
    cachedLogoBuffer = readFileSync(filePath)
    return cachedLogoBuffer
  } catch (err) {
    console.warn('[email] could not read crown logo PNG:', err)
    return null
  }
}

type SmtpConfig = {
  host: string
  port: number
  user: string
  password: string
  fromName: string
}

function readSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim()
  const portRaw = process.env.SMTP_PORT?.trim()
  const user = process.env.SMTP_USER?.trim()
  const password = process.env.SMTP_PASSWORD?.trim()
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'MVR-OS'
  if (!host || !portRaw || !user || !password) return null
  const port = Number.parseInt(portRaw, 10)
  if (!Number.isFinite(port)) return null
  return { host, port, user, password, fromName }
}

let cachedTransporter: Transporter | null = null
let cachedConfigSignature: string | null = null

function getTransporter(cfg: SmtpConfig): Transporter {
  const signature = `${cfg.host}:${cfg.port}:${cfg.user}`
  if (cachedTransporter && cachedConfigSignature === signature) {
    return cachedTransporter
  }
  cachedTransporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465, // STARTTLS on 587, implicit TLS on 465
    auth: { user: cfg.user, pass: cfg.password },
  })
  cachedConfigSignature = signature
  return cachedTransporter
}

// `InvitationPermission` is still exported because the API routes persist
// the granted permissions on the UserInvitation row. The email template no
// longer renders them — they are seeded silently on first sign-in.
export type InvitationPermission = { resource: Resource; level: Level }

// ── Generic transactional send ────────────────────────────────────────────────
// Reuses the same SMTP transport as the invitation email. Used by owner renewal
// alerts (and any future one-off email). Gracefully no-ops when SMTP is unset.

export type SendEmailParams = {
  to: string
  subject: string
  html?: string
  text?: string
}

export type SendEmailResult =
  | { sent: true; messageId: string }
  | { sent: false; skipped: true; reason: 'no_smtp_config' }
  | { sent: false; error: string }

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Wrap a plain-text body in a minimal branded HTML shell. Escapes HTML, then
// applies the same lightweight markup the composer toolbar produces —
// *bold* → <strong>, _italic_ → <em> — and turns newlines into <br>.
export function wrapPlainTextHtml(text: string): string {
  const body = escapeHtml(text)
    .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
    .replace(/_([^_\n]+)_/g, '<em>$1</em>')
    .replace(/\n/g, '<br>')
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E2D40;max-width:600px;margin:0 auto;padding:24px">${body}</div>`
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const cfg = readSmtpConfig()
  if (!cfg) {
    console.warn('[email] SMTP not configured — email will not be sent.')
    return { sent: false, skipped: true, reason: 'no_smtp_config' }
  }
  const html = params.html ?? (params.text ? wrapPlainTextHtml(params.text) : undefined)
  try {
    const info = await getTransporter(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.user}>`,
      to: params.to,
      subject: params.subject,
      html,
      text: params.text,
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    console.error('[email] sendEmail failed:', msg)
    return { sent: false, error: msg }
  }
}

export type SendInvitationParams = {
  to: string
  name?: string | null
  token: string
  inviterName: string
  inviterEmail: string
  message?: string | null
  permissions: InvitationPermission[]
  expiresAt: Date
}

export type SendInvitationResult =
  | { sent: true; messageId: string }
  | { sent: false; skipped: true; reason: 'no_smtp_config' }
  | { sent: false; error: string }

export async function sendInvitationEmail(
  params: SendInvitationParams
): Promise<SendInvitationResult> {
  const cfg = readSmtpConfig()
  if (!cfg) {
    console.warn('[email] SMTP not configured — invitation will not be emailed.')
    return { sent: false, skipped: true, reason: 'no_smtp_config' }
  }

  // Prefer PUBLIC_APP_URL so invitation links always point to the public
  // domain — even when generated from a local dev server. Falls back to
  // NEXTAUTH_URL (Vercel sets this to the deployment URL automatically),
  // then localhost as a last resort for fully offline dev.
  const baseUrl = (
    process.env.PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    'http://localhost:3000'
  ).replace(/\/$/, '')
  const acceptUrl = `${baseUrl}/invite/${encodeURIComponent(params.token)}`

  const html = renderInvitationEmail({
    inviteeName: params.name ?? null,
    inviterName: params.inviterName,
    inviterEmail: params.inviterEmail,
    message: params.message ?? null,
    acceptUrl,
    expiresAt: params.expiresAt,
    logoCid: LOGO_CID,
  })

  const expiresLabel = params.expiresAt.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
  const greeting = params.name ? `Hi ${params.name.split(/\s+/)[0]},` : 'Hi there,'

  const logoBuffer = loadLogoBuffer()
  const attachments = logoBuffer
    ? [
        {
          filename: 'mvr-crown-logo.png',
          content: logoBuffer,
          cid: LOGO_CID,
          contentType: 'image/png',
        },
      ]
    : undefined

  try {
    const info = await getTransporter(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.user}>`,
      to: params.to,
      subject: `You've been invited to MVR-OS by ${params.inviterName}`,
      html,
      text: `${greeting}\n\n${params.inviterName} (${params.inviterEmail}) has invited you to join MVR-OS, the internal operations platform for Miami Vacation Rentals.\n\nAccept your invitation:\n${acceptUrl}\n\nHow to sign in:\n  1. Open the link above.\n  2. Sign in with your @miamivacationrentals.com Google account.\n  3. You'll land on your MVR-OS dashboard.\n\nThis invitation expires on ${expiresLabel}.\n\nIf you weren't expecting this invitation, you can safely ignore this email.`,
      attachments,
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    console.error('[email] sendInvitationEmail failed:', msg)
    return { sent: false, error: msg }
  }
}
