import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldOff, LogOut } from 'lucide-react'
import { auth } from '@/lib/auth'
import { hasAnyAccess } from '@/lib/auth/permissions'

export const metadata: Metadata = { title: 'Pending access — MVR Ops Hub' }
export const dynamic = 'force-dynamic'

// Landing for authenticated users who have no permissions assigned yet.
// If the user actually does have access, bounce them back to the dashboard.
export default async function NoAccessPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (await hasAnyAccess(session)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-mvr-cream flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-panel border border-[#E0DBD4] p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-mvr-sand-light flex items-center justify-center mb-5">
          <ShieldOff className="w-7 h-7 text-mvr-primary" aria-hidden />
        </div>
        <h1 className="font-display text-2xl text-mvr-primary mb-2">
          Pending access
        </h1>
        <p className="text-sm text-mvr-olive leading-relaxed">
          Your account <span className="font-mono text-mvr-primary">{session.user.email}</span> is
          signed in, but no permissions have been assigned yet.
        </p>
        <p className="text-sm text-muted-foreground mt-3">
          Reach out to your MVR administrator to get access to the modules you need.
        </p>

        <div className="mt-6 pt-5 border-t border-[#E0DBD4]">
          <Link
            href="/api/auth/signout"
            className="inline-flex items-center gap-2 text-sm font-medium text-mvr-primary hover:underline"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Link>
        </div>
      </div>
    </div>
  )
}
