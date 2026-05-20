import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, CalendarClock, ShieldOff } from 'lucide-react'
import { db } from '@/lib/db'
import { RESOURCES, isResource, type Level } from '@/lib/auth/resources'
import { AcceptInvitationButton } from '@/components/modules/settings/users/AcceptInvitationButton'

export const metadata: Metadata = { title: 'Invitation — MVR-OS' }
export const dynamic = 'force-dynamic'

function CrownLogo() {
  return (
    <svg
      width="44"
      height="38"
      viewBox="0 0 28 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14 2L18.5 10L24 4L22 20H6L4 4L9.5 10L14 2Z"
        fill="#1E2D40"
        stroke="#A2B4C0"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <rect x="5" y="20" width="18" height="2.5" rx="1" fill="#CEC4B6" />
    </svg>
  )
}

function ExpiredOrInvalid({ reason }: { reason: 'invalid' | 'expired' | 'accepted' }) {
  const copy = {
    invalid: {
      title: 'Invitación inválida',
      body: 'El enlace que abriste no corresponde a ninguna invitación activa.',
    },
    expired: {
      title: 'Invitación expirada',
      body: 'Esta invitación ya no es válida. Pide a tu administrador que te envíe una nueva.',
    },
    accepted: {
      title: 'Invitación ya aceptada',
      body: 'Esta invitación ya fue usada. Inicia sesión normalmente para entrar a MVR-OS.',
    },
  }[reason]

  return (
    <div className="min-h-screen bg-mvr-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-panel border border-[#E0DBD4] p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-mvr-sand-light flex items-center justify-center mb-5">
          <ShieldOff className="w-7 h-7 text-mvr-primary" aria-hidden />
        </div>
        <h1 className="font-display text-2xl text-mvr-primary mb-2">{copy.title}</h1>
        <p className="text-sm text-mvr-olive leading-relaxed">{copy.body}</p>
        <div className="mt-6 pt-5 border-t border-[#E0DBD4]">
          <Link href="/login" className="text-sm font-medium text-mvr-primary hover:underline">
            Ir al login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const token = decodeURIComponent(params.token)

  const invitation = await db.userInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      name: true,
      permissions: true,
      invitedBy: true,
      expiresAt: true,
      acceptedAt: true,
    },
  })

  if (!invitation) return <ExpiredOrInvalid reason="invalid" />
  if (invitation.acceptedAt) return <ExpiredOrInvalid reason="accepted" />
  if (invitation.expiresAt < new Date()) return <ExpiredOrInvalid reason="expired" />

  const inviter = await db.user.findUnique({
    where: { id: invitation.invitedBy },
    select: { name: true, email: true },
  })

  const stored =
    (invitation.permissions as Array<{ resource: string; level: Level }> | null) ?? []
  const validPerms = stored.filter(
    (p) => isResource(p.resource) && (p.level === 'view' || p.level === 'edit')
  )

  const labelByKey = new Map(RESOURCES.map((r) => [r.key, r] as const))
  const groupedPerms = new Map<string, Array<{ label: string; level: Level }>>()
  for (const p of validPerms) {
    const meta = labelByKey.get(p.resource as (typeof RESOURCES)[number]['key'])
    if (!meta) continue
    const list = groupedPerms.get(meta.group) ?? []
    list.push({ label: meta.label, level: p.level })
    groupedPerms.set(meta.group, list)
  }

  const expiresLabel = invitation.expiresAt.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-mvr-cream flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-6">
          <div className="mx-auto inline-flex items-center justify-center">
            <CrownLogo />
          </div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-mvr-primary font-semibold">
            Miami Vacation Rentals
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-panel border border-[#E0DBD4] p-8">
          <h1 className="font-display text-2xl text-mvr-primary leading-tight">
            Has sido invitado a MVR-OS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            La plataforma operacional interna de Miami Vacation Rentals.
          </p>

          <div className="mt-6 space-y-2 text-sm text-mvr-olive">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>
                Invitación para{' '}
                <span className="font-mono text-mvr-primary">{invitation.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" />
              <span>Expira el {expiresLabel}</span>
            </div>
            {inviter && (
              <p className="pt-2 text-sm">
                Invitado por{' '}
                <span className="font-medium text-mvr-primary">
                  {inviter.name?.trim() || inviter.email}
                </span>
              </p>
            )}
          </div>

          {groupedPerms.size > 0 ? (
            <div className="mt-6 pt-6 border-t border-[#E0DBD4]">
              <h2 className="text-[11px] uppercase tracking-widest font-semibold text-mvr-primary mb-3">
                Acceso otorgado
              </h2>
              <div className="space-y-3">
                {Array.from(groupedPerms.entries()).map(([group, items]) => (
                  <div key={group}>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-mvr-primary/70 mb-1">
                      {group}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((it) => (
                        <span
                          key={it.label}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            it.level === 'edit'
                              ? 'bg-mvr-primary text-white'
                              : 'bg-mvr-sand-light text-mvr-primary'
                          }`}
                        >
                          {it.label}
                          <span className="text-[9px] opacity-80 uppercase">{it.level}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-6 border-t border-[#E0DBD4] text-xs text-muted-foreground">
              El administrador asignará tus permisos después de tu primer inicio de sesión.
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-[#E0DBD4]">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              Inicia sesión con tu cuenta corporativa de Google para activar tu acceso.
            </p>
            <AcceptInvitationButton expectedEmail={invitation.email} />
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          ¿No esperabas esta invitación? Puedes ignorar este enlace.
        </p>
      </div>
    </div>
  )
}
