'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * A disclosure card: a clickable header (title + count + chevron) that expands
 * or collapses its body. Used to group the Guesty integration tables (Listings,
 * Owners) so each list can be shown or hidden independently.
 */
export default function CollapsibleSection({
  title,
  subtitle,
  count,
  defaultOpen = false,
  children,
}: {
  title: string
  subtitle?: string
  count?: number
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="overflow-hidden rounded-xl border border-[#E0DBD4] bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors hover:bg-mvr-neutral/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mvr-primary/20"
      >
        <span className="flex items-baseline gap-2">
          <span className="font-display text-xl text-mvr-primary">{title}</span>
          {typeof count === 'number' && (
            <span className="rounded-full bg-mvr-neutral px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {count}
            </span>
          )}
          {subtitle && <span className="hidden text-xs text-muted-foreground sm:inline">· {subtitle}</span>}
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="border-t border-[#E0DBD4]">{children}</div>}
    </section>
  )
}
