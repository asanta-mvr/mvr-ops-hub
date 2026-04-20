'use client'

import { signOut, useSession } from 'next-auth/react'
import { LogOut, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SessionUser {
  name?: string | null
  email?: string | null
  image?: string | null
  role?: string
}

export function Header() {
  const { data: session } = useSession()
  const user = session?.user as SessionUser | undefined

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 shrink-0">
      <div />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserCircle className="w-4 h-4" />
          <span>{user?.name ?? 'User'}</span>
          {user?.role && (
            <span className="text-xs bg-mvr-primary-light text-mvr-primary px-2 py-0.5 rounded-full font-medium">
              {user.role.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  )
}
