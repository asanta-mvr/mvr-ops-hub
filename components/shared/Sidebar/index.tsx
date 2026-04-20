'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Database,
  HeadphonesIcon,
  Wrench,
  Plug,
  Building2,
  Users,
  Home,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Data Master',
    href: '/data-master',
    icon: Database,
    children: [
      { label: 'Buildings', href: '/data-master/buildings', icon: Building2 },
      { label: 'Units', href: '/data-master/units', icon: Home },
      { label: 'Owners', href: '/data-master/owners', icon: Users },
      { label: 'Listings', href: '/data-master/listings', icon: FileText },
      { label: 'Contracts', href: '/data-master/contracts', icon: FileText },
    ],
  },
  {
    label: 'Customer Success',
    href: '/customer-success',
    icon: HeadphonesIcon,
  },
  {
    label: 'Operations',
    href: '/operations',
    icon: Wrench,
  },
  {
    label: 'Integrations',
    href: '/integrations',
    icon: Plug,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-mvr-primary flex flex-col">
      <div className="px-6 py-5 border-b border-white/10">
        <span className="text-white font-bold text-lg tracking-tight">MVR Ops Hub</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isTop = !item.children

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive && isTop
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>

              {item.children && isActive && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors',
                          isChildActive
                            ? 'bg-white/20 text-white font-medium'
                            : 'text-white/60 hover:bg-white/10 hover:text-white'
                        )}
                      >
                        <ChildIcon className="w-3.5 h-3.5 shrink-0" />
                        {child.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-white/10 text-xs text-white/40 text-center">
        Miami Vacation Rentals
      </div>
    </aside>
  )
}
