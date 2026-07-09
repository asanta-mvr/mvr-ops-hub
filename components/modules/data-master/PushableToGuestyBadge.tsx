import { ArrowUpFromLine } from 'lucide-react'

/**
 * Tag marking a card whose fields can (in a future feature) be pushed to update
 * the Guesty listing. Purely informational for now — hovering the tag reveals the
 * explanatory note; nothing is written yet.
 */
export function PushableToGuestyBadge({ note }: { note?: string }) {
  return (
    <span className="group relative inline-flex">
      <span className="inline-flex cursor-default items-center gap-1 rounded-full bg-mvr-primary-light px-2.5 py-0.5 text-xs font-medium text-mvr-primary">
        <ArrowUpFromLine className="size-3" />
        Push
      </span>
      {note ? (
        <span
          role="tooltip"
          className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 w-60 rounded-lg border border-[#E0DBD4] bg-white p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-muted-foreground opacity-0 shadow-panel transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          {note}
        </span>
      ) : null}
    </span>
  )
}
