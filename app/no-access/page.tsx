import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldOff, LogOut, Mail } from 'lucide-react'
import { auth } from '@/lib/auth'
import { hasAnyAccess } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'Pending access — MVR-OS' }
export const dynamic = 'force-dynamic'

type Reason = 'noinvite' | 'disabled' | 'pending'

function parseReason(value: string | string[] | undefined): Reason {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === 'noinvite' || raw === 'disabled') return raw
  return 'pending'
}

const COPY: Record<Reason, { title: string; body: string; secondary: string }> = {
  noinvite: {
    title: 'Aún no tienes acceso',
    body: 'No encontramos una invitación activa para tu cuenta. Pide a un administrador de MVR que te invite desde la sección de Users.',
    secondary: 'Si crees que esto es un error, contacta al equipo de operaciones.',
  },
  disabled: {
    title: 'Cuenta deshabilitada',
    body: 'Tu cuenta existe en MVR-OS pero fue desactivada. Contacta a un administrador para reactivarla.',
    secondary: 'Por seguridad, no podrás acceder hasta que un admin restablezca el acceso.',
  },
  pending: {
    title: 'Acceso pendiente',
    body: 'Tu cuenta está dada de alta pero aún no tienes permisos asignados a ningún módulo.',
    secondary: 'Habla con tu administrador de MVR para que te asigne los módulos que necesitas.',
  },
}

export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: { reason?: string | string[] }
}) {
  const reason = parseReason(searchParams.reason)
  const session = await auth()

  if (session?.user && (await hasAnyAccess(session))) {
    redirect('/dashboard')
  }

  const copy = COPY[reason]
  const showSignOut = !!session?.user

  return (
    <div className="min-h-screen bg-mvr-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-panel border border-[#E0DBD4] p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-mvr-sand-light flex items-center justify-center mb-5">
          <ShieldOff className="w-7 h-7 text-mvr-primary" aria-hidden />
        </div>
        <h1 className="font-display text-2xl text-mvr-primary mb-2">{copy.title}</h1>

        {session?.user?.email && (
          <p className="text-sm text-mvr-olive leading-relaxed">
            Cuenta:{' '}
            <span className="font-mono text-mvr-primary">{session.user.email}</span>
          </p>
        )}

        <p className="text-sm text-mvr-olive leading-relaxed mt-3">{copy.body}</p>
        <p className="text-xs text-muted-foreground mt-3">{copy.secondary}</p>

        <div className="mt-6 pt-5 border-t border-[#E0DBD4] flex items-center justify-center gap-4 text-sm flex-wrap">
          <a
            href="mailto:a.santa@miamivacationrentals.com"
            className="inline-flex items-center gap-2 font-medium text-mvr-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            Contactar admin
          </a>

          {showSignOut ? (
            <Link
              href="/api/auth/signout"
              className="inline-flex items-center gap-2 font-medium text-mvr-primary hover:underline"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-medium text-mvr-primary hover:underline"
            >
              Volver al login
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
