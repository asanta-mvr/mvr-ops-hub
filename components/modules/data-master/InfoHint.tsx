'use client'

import { Info } from 'lucide-react'

/**
 * Small info icon that reveals a help bubble on hover/focus — used to tuck the
 * explanatory blurb away from a card header and keep the UI clean.
 */
export function InfoHint({ text, label = 'More information' }: { text: string; label?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className="text-mvr-steel transition-colors hover:text-mvr-primary focus:outline-none focus-visible:text-mvr-primary"
      >
        <Info className="size-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-20 mt-1.5 w-60 rounded-lg border border-[#E0DBD4] bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  )
}
