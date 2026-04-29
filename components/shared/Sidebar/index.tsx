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
  ChevronDown,
  Ticket,
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
      { label: 'Buildings',  href: '/data-master/buildings',  icon: Building2 },
      { label: 'Units',      href: '/data-master/units',      icon: Home      },
      { label: 'Owners',     href: '/data-master/owners',     icon: Users     },
      { label: 'Listings',   href: '/data-master/listings',   icon: FileText  },
      { label: 'Contracts',  href: '/data-master/contracts',  icon: FileText  },
    ],
  },
  {
    label: 'Customer Success',
    href: '/customer-success/tickets',
    icon: HeadphonesIcon,
    children: [
      { label: 'OTA Tickets', href: '/customer-success/tickets', icon: Ticket },
    ],
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

function CrownLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/mvr-crown-logo.png"
      alt="MVR crown logo"
      width={26}
      height={26}
      className="rounded-sm shrink-0"
    />
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen flex flex-col" style={{ background: '#1E2D40' }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <CrownLogo />
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm tracking-wide">MVR - OPS HUB</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const hasChildren = !!item.children

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-white/12 text-white'
                    : 'text-white/55 hover:bg-white/8 hover:text-white/90'
                )}
              >
                <Icon className={cn(
                  'w-4 h-4 shrink-0 transition-colors',
                  isActive ? 'text-mvr-sand' : 'text-white/40 group-hover:text-white/70'
                )} />
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <ChevronDown className={cn(
                    'w-3.5 h-3.5 transition-transform text-white/30',
                    isActive && 'rotate-180 text-white/50'
                  )} />
                )}
              </Link>

              {item.children && isActive && (
                <div className="mt-0.5 mb-1 ml-3 pl-4 border-l border-white/10 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/')
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-all duration-150',
                          isChildActive
                            ? 'bg-white/10 text-white font-medium'
                            : 'text-white/45 hover:bg-white/6 hover:text-white/80'
                        )}
                      >
                        <ChildIcon className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          isChildActive ? 'text-mvr-sand' : 'text-white/30'
                        )} />
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10 space-y-1">
        <p className="text-[10px] text-white/35 uppercase tracking-widest text-center">
          Developed by Tech
        </p>
        <p className="text-[10px] text-white/25 uppercase tracking-widest text-center">
          Stay Iconic
        </p>
      </div>
    </aside>
  )
}
