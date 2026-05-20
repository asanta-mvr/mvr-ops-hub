// Email transport for invitation emails. Uses Gmail SMTP with an App Password
// (see .env.example for setup steps). The transporter is lazy-created on the
// first send so a missing/incomplete SMTP config does not crash the app at
// boot; instead, `sendInvitationEmail` reports `{ skipped: true }` and the
// caller decides how to surface it.
import nodemailer, { type Transporter } from 'nodemailer'
import { renderInvitationEmail } from './templates/invitation'
import { RESOURCES, type Level, type Resource } from '@/lib/auth/resources'

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

export type InvitationPermission = { resource: Resource; level: Level }

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

function permissionsSummary(
  permissions: InvitationPermission[]
): Array<{ group: string; label: string; level: Level }> {
  const byKey = new Map(RESOURCES.map((r) => [r.key, r] as const))
  const out: Array<{ group: string; label: string; level: Level }> = []
  for (const p of permissions) {
    const meta = byKey.get(p.resource)
    if (!meta) continue
    out.push({ group: meta.group, label: meta.label, level: p.level })
  }
  return out
}

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
    permissions: permissionsSummary(params.permissions),
    expiresAt: params.expiresAt,
  })

  try {
    const info = await getTransporter(cfg).sendMail({
      from: `"${cfg.fromName}" <${cfg.user}>`,
      to: params.to,
      subject: `Has sido invitado a MVR-OS por ${params.inviterName}`,
      html,
      text: `Hola${params.name ? ' ' + params.name : ''},\n\n${params.inviterName} (${params.inviterEmail}) te ha invitado a usar MVR-OS, la plataforma operacional de Miami Vacation Rentals.\n\nAcepta la invitación aquí: ${acceptUrl}\n\nEste enlace expira el ${params.expiresAt.toLocaleString('es-MX')}.\n\nSi no esperabas esta invitación, puedes ignorar este mensaje.`,
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown SMTP error'
    console.error('[email] sendInvitationEmail failed:', msg)
    return { sent: false, error: msg }
  }
}
