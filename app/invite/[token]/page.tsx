import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { db } from '@/lib/db'
import { AcceptInvitationButton } from '@/components/modules/settings/users/AcceptInvitationButton'

export const metadata: Metadata = { title: 'Invitation — MVR-OS' }
export const dynamic = 'force-dynamic'

function ExpiredOrInvalid({ reason }: { reason: 'invalid' | 'expired' | 'accepted' }) {
  const copy = {
    invalid: {
      title: 'Invalid invitation',
      body: 'The link you opened does not match any active invitation.',
    },
    expired: {
      title: 'Invitation expired',
      body: 'This invitation is no longer valid. Ask your administrator to send a new one.',
    },
    accepted: {
      title: 'Invitation already accepted',
      body: 'This invitation has already been used. Sign in normally to access MVR-OS.',
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
            Go to login
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
      expiresAt: true,
      acceptedAt: true,
    },
  })

  if (!invitation) return <ExpiredOrInvalid reason="invalid" />
  if (invitation.acceptedAt) return <ExpiredOrInvalid reason="accepted" />
  if (invitation.expiresAt < new Date()) return <ExpiredOrInvalid reason="expired" />

  return (
    <div className="min-h-screen bg-mvr-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm mx-auto">
        <div className="bg-white rounded-2xl shadow-panel p-8 flex flex-col gap-5">
          <div className="text-center flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/mvr-crown-logo.png"
              alt="MVR"
              width={48}
              height={48}
              className="rounded-sm"
            />
            <div>
              <h1 className="font-display text-2xl font-bold text-mvr-primary tracking-tight">
                Miami Vacation Rentals
              </h1>
              <p className="text-xs text-mvr-sand font-medium uppercase tracking-[0.15em] mt-0.5">
                Operations Hub
              </p>
            </div>
          </div>

          <AcceptInvitationButton expectedEmail={invitation.email} />

          <p className="text-xs text-center text-muted-foreground">
            Access restricted to authorized MVR team members.
          </p>
        </div>
      </div>
    </div>
  )
}
