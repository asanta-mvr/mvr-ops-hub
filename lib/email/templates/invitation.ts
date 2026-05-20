// HTML invitation email template. Inline styles only — email clients (Gmail
// especially) strip <style> blocks and most CSS classes. Brand palette is
// hardcoded to match `tailwind.config.ts` since email cannot import tokens.
// The crown logo is referenced via `cid:` so nodemailer can ship it as an
// inline attachment — this avoids the Gmail image proxy choking on the
// hosted URL, which left recipients with a broken-image placeholder.

type TemplateParams = {
  inviteeName: string | null
  inviterName: string
  inviterEmail: string
  message: string | null
  acceptUrl: string
  expiresAt: Date
  logoCid: string
}

const BRAND = {
  primary: '#1E2D40',
  sand: '#CEC4B6',
  sandLight: '#F5F1EB',
  cream: '#F7F4F0',
  olive: '#2D2A1C',
  border: '#E0DBD4',
} as const

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderInvitationEmail(params: TemplateParams): string {
  const expiresLabel = params.expiresAt.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const firstName = params.inviteeName?.split(/\s+/)[0] ?? null
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi there,'

  const messageBlock = params.message
    ? `<div style="margin-top:18px;padding:14px 16px;background:${BRAND.sandLight};border-left:3px solid ${BRAND.sand};border-radius:6px;">
         <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;color:${BRAND.primary};font-weight:700;margin-bottom:4px;">Message from ${escapeHtml(params.inviterName)}</div>
         <p style="margin:0;font-size:14px;color:${BRAND.olive};line-height:1.5;white-space:pre-wrap;">${escapeHtml(params.message)}</p>
       </div>`
    : ''

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Invitation to MVR-OS</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.olive};">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="text-align:center;padding:24px 0 16px;">
      <img src="cid:${params.logoCid}" alt="MVR" width="56" height="56" style="display:inline-block;border:0;outline:none;text-decoration:none;height:56px;width:56px;">
      <div style="margin-top:10px;font-size:11px;text-transform:uppercase;letter-spacing:0.18em;color:${BRAND.primary};font-weight:600;">Miami Vacation Rentals</div>
    </div>

    <div style="background:#FFFFFF;border:1px solid ${BRAND.border};border-radius:16px;padding:32px 28px;box-shadow:0 1px 2px rgba(30,45,64,0.04);">
      <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:700;color:${BRAND.primary};line-height:1.2;text-align:center;">You've been invited to MVR-OS</h1>
      <p style="margin:0 0 4px;color:#6B6B66;font-size:13px;text-align:center;">The internal operations platform for Miami Vacation Rentals.</p>

      <div style="margin-top:24px;font-size:15px;line-height:1.6;color:${BRAND.olive};">
        <p style="margin:0 0 12px;">${greeting}</p>
        <p style="margin:0;">
          <strong style="color:${BRAND.primary};">${escapeHtml(params.inviterName)}</strong>
          (<span style="font-family:Menlo,Consolas,monospace;font-size:13px;">${escapeHtml(params.inviterEmail)}</span>)
          has invited you to join MVR-OS.
        </p>
      </div>

      ${messageBlock}

      <div style="text-align:center;margin:28px 0 12px;">
        <a href="${params.acceptUrl}" style="display:inline-block;background:${BRAND.primary};color:#FFFFFF;text-decoration:none;padding:14px 32px;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:0.02em;">
          Accept invitation
        </a>
      </div>

      <div style="margin-top:24px;padding-top:20px;border-top:1px solid ${BRAND.border};">
        <h2 style="margin:0 0 10px;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:${BRAND.primary};font-weight:700;">How to sign in</h2>
        <ol style="margin:0;padding-left:20px;font-size:14px;color:${BRAND.olive};line-height:1.6;">
          <li style="margin-bottom:4px;">Click the <strong>Accept invitation</strong> button above.</li>
          <li style="margin-bottom:4px;">Sign in with your <strong>@miamivacationrentals.com</strong> Google account.</li>
          <li>You'll land on your MVR-OS dashboard.</li>
        </ol>
      </div>

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid ${BRAND.border};font-size:12px;color:#6B6B66;line-height:1.5;">
        <p style="margin:0 0 6px;">This invitation expires on <strong>${expiresLabel}</strong>.</p>
        <p style="margin:0 0 8px;">Trouble with the button? Copy this link into your browser:</p>
        <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:11px;color:${BRAND.primary};word-break:break-all;">${params.acceptUrl}</p>
      </div>
    </div>

    <p style="text-align:center;font-size:11px;color:#9B9B95;margin:20px 0 0;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>

  </div>
</body>
</html>`
}
