'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_CONFIG, isGroup, type NavItem } from './nav-config'

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

interface Props {
  /** Resources the current user is allowed to view, computed server-side. */
  allowedResources: string[]
}

export function SidebarClient({ allowedResources }: Props) {
  const pathname = usePathname()
  const allowed = new Set(allowedResources)

  // Drop items the user can't view. A group is kept only if it has at least
  // one visible child.
  const items: NavItem[] = []
  for (const item of NAV_CONFIG) {
    if (isGroup(item)) {
      const kids = item.children.filter((c) => allowed.has(c.resource))
      if (kids.length > 0) items.push({ ...item, children: kids })
    } else if (allowed.has(item.resource)) {
      items.push(item)
    }
  }

  return (
    <aside
      className="w-60 min-h-screen flex flex-col"
      style={{ background: '#1E2D40' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <CrownLogo />
          <div className="leading-tight">
            <p className="text-white font-semibold text-sm tracking-wide">MVR - OPS HUB</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const hasChildren = isGroup(item)
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
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-mvr-sand' : 'text-white/40 group-hover:text-white/70'
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {hasChildren && (
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform text-white/30',
                      isActive && 'rotate-180 text-white/50'
                    )}
                  />
                )}
              </Link>

              {hasChildren && isActive && (
                <div className="mt-0.5 mb-1 ml-3 pl-4 border-l border-white/10 space-y-0.5">
                  {item.children.map((child) => {
                    const ChildIcon = child.icon
                    const isChildActive =
                      pathname === child.href || pathname.startsWith(child.href + '/')
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
                        <ChildIcon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            isChildActive ? 'text-mvr-sand' : 'text-white/30'
                          )}
                        />
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
