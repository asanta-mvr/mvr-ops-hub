'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, ChevronDown } from 'lucide-react'

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

const ROLE_LABELS: Record<string, string> = {
  super_admin:        'Super Admin',
  operations_manager: 'Operations',
  owner_relations:    'Owner Relations',
  cx_agent:           'CX Agent',
  maintenance_tech:   'Maintenance',
  housekeeping:       'Housekeeping',
  accounting:         'Accounting',
  read_only:          'Read Only',
}

export function Header() {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <header className="h-14 border-b border-[#E0DBD4] bg-white flex items-center justify-between px-6 shrink-0">
      <div />

      <div className="flex items-center gap-2">
        {/* Avatar + user info */}
        <div className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-mvr-cream transition-colors cursor-default">
          <div className="w-7 h-7 rounded-full bg-mvr-primary flex items-center justify-center shrink-0">
            <span className="text-white text-[11px] font-semibold">{initials}</span>
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-mvr-primary leading-none">{user?.name ?? 'User'}</p>
            {user?.role && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {ROLE_LABELS[user.role] ?? user.role}
              </p>
            )}
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-1" />
        </div>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="p-2 rounded-lg text-muted-foreground hover:text-mvr-primary hover:bg-mvr-cream transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
