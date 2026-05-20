// HTML invitation email template. Inline styles only — email clients (Gmail
// especially) strip <style> blocks and most CSS classes. Brand palette
// hardcoded to match `tailwind.config.ts` since email cannot import tokens.
import type { Level } from '@/lib/auth/resources'

type TemplateParams = {
  inviteeName: string | null
  inviterName: string
  inviterEmail: string
  message: string | null
  acceptUrl: string
  permissions: Array<{ group: string; label: string; level: Level }>
  expiresAt: Date
}

const BRAND = {
  primary: '#1E2D40',
  sand: '#CEC4B6',
  sandLight: '#F5F1EB',
  cream: '#F7F4F0',
  olive: '#2D2A1C',
  neutral: '#EDEAE4',
  border: '#E0DBD4',
  steel: '#A2B4C0',
} as const

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function groupPermissions(
  perms: TemplateParams['permissions']
): Array<{ group: string; items: Array<{ label: string; level: Level }> }> {
  const map = new Map<string, Array<{ label: string; level: Level }>>()
  for (const p of perms) {
    const list = map.get(p.group) ?? []
    list.push({ label: p.label, level: p.level })
    map.set(p.group, list)
  }
  return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
}

function levelBadge(level: Level): string {
  const bg = level === 'edit' ? BRAND.primary : BRAND.sandLight
  const fg = level === 'edit' ? '#FFFFFF' : BRAND.primary
  const label = level === 'edit' ? 'Edit' : 'View'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:${bg};color:${fg};letter-spacing:0.05em;text-transform:uppercase;">${label}</span>`
}

export function renderInvitationEmail(params: TemplateParams): string {
  const grouped = groupPermissions(params.permissions)
  const expiresLabel = params.expiresAt.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const permissionsBlock =
    grouped.length === 0
      ? `<p style="margin:0;color:${BRAND.olive};font-size:14px;">El administrador asignará tus permisos después.</p>`
      : grouped
          .map(
            (g) => `
            <div style="margin-bottom:14px;">
              <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:${BRAND.primary};font-weight:700;margin-bottom:6px;">${escapeHtml(g.group)}</div>
              ${g.items
                .map(
                  (it) => `
                <div style="padding:6px 0;border-bottom:1px solid ${BRAND.border};">
                  <span style="font-size:14px;color:${BRAND.olive};">${escapeHtml(it.label)}</span>
                  <span style="float:right;">${levelBadge(it.level)}</span>
                </div>`
                )
                .join('')}
            </div>`
          )
          .join('')

  const greeting = params.inviteeName
    ? `Hola ${escapeHtml(params.inviteeName.split(/\s+/)[0])},`
    : 'Hola,'

  const messageBlock = params.message
    ? `<div style="margin-top:18px;padding:14px 16px;background:${BRAND.sandLight};border-left:3px solid ${BRAND.sand};border-radius:6px;">
         <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND.primary};font-weight:700;margin-bottom:4px;">Mensaje de ${escapeHtml(params.inviterName)}</div>
         <p style="margin:0;font-size:14px;color:${BRAND.olive};line-height:1.5;white-space:pre-wrap;">${escapeHtml(params.message)}</p>
       </div>`
    : ''

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invitación a MVR-OS</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.olive};">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;padding:24px 0 16px;">
      <svg width="44" height="38" viewBox="0 0 28 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 2L18.5 10L24 4L22 20H6L4 4L9.5 10L14 2Z" fill="${BRAND.primary}" stroke="${BRAND.steel}" stroke-width="1.2" stroke-linejoin="round"/>
        <rect x="5" y="20" width="18" height="2.5" rx="1" fill="${BRAND.sand}"/>
      </svg>
      <div style="margin-top:8px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:${BRAND.primary};font-weight:600;">Miami Vacation Rentals</div>
    </div>

    <div style="background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:16px;padding:32px 28px;box-shadow:0 1px 2px rgba(30,45,64,0.04);">
      <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${BRAND.primary};line-height:1.2;">Has sido invitado a MVR-OS</h1>
      <p style="margin:0;color:#6B6B66;font-size:13px;">La plataforma operacional interna de Miami Vacation Rentals.</p>

      <div style="margin-top:24px;font-size:15px;line-height:1.6;color:${BRAND.olive};">
        <p style="margin:0 0 12px;">${greeting}</p>
        <p style="margin:0;">
          <strong style="color:${BRAND.primary};">${escapeHtml(params.inviterName)}</strong>
          (<span style="font-family:Menlo,Consolas,monospace;font-size:13px;">${escapeHtml(params.inviterEmail)}</span>)
          te ha invitado a unirte a MVR-OS para que empieces a usar la plataforma y dar feedback.
        </p>
      </div>

      ${messageBlock}

      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${params.acceptUrl}" style="display:inline-block;background:${BRAND.primary};color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Aceptar invitación
        </a>
      </div>
      <p style="margin:0;text-align:center;font-size:12px;color:#6B6B66;">
        O copia este enlace:<br>
        <span style="font-family:Menlo,Consolas,monospace;font-size:11px;color:${BRAND.primary};word-break:break-all;">${params.acceptUrl}</span>
      </p>

      <div style="margin-top:32px;padding-top:20px;border-top:1px solid ${BRAND.border};">
        <h2 style="margin:0 0 14px;font-size:13px;text-transform:uppercase;letter-spacing:0.12em;color:${BRAND.primary};font-weight:700;">Acceso otorgado</h2>
        ${permissionsBlock}
      </div>

      <div style="margin-top:28px;padding-top:20px;border-top:1px solid ${BRAND.border};font-size:12px;color:#6B6B66;line-height:1.5;">
        <p style="margin:0 0 8px;">Este enlace expira el <strong>${expiresLabel}</strong>.</p>
        <p style="margin:0;">Si no esperabas esta invitación, puedes ignorar este mensaje.</p>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#9B9B95;margin:20px 0 0;">
      MVR-OS · Miami Vacation Rentals
    </p>

  </div>
</body>
</html>`
}
