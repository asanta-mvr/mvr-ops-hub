'use client'

import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

// A standard Data Master card whose body can be expanded/collapsed by clicking
// the title. `actions` render on the right of the header and never toggle the
// card (so action buttons keep working). Defaults to open.
export default function CollapsibleCard({
  title,
  actions,
  defaultOpen = true,
  children,
}: {
  title: ReactNode
  actions?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`size-4 shrink-0 text-mvr-steel transition-transform ${open ? '' : '-rotate-90'}`}
          />
          <h3 className="truncate font-display text-lg text-mvr-primary">{title}</h3>
        </button>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
