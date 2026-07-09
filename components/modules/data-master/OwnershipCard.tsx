interface OwnerRow {
  guestyId: string
  name: string
  mapped: boolean
}

/**
 * Right-column ownership card for the listing detail page. Shows the Guesty
 * owners for this listing with a Mapped/Unmapped indicator. Relocated from the
 * left-column Guesty detail section. Renders nothing when there are no owners.
 */
export default function OwnershipCard({ owners }: { owners: OwnerRow[] }) {
  if (owners.length === 0) return null

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
      <h3 className="font-display text-lg text-mvr-primary">Ownership</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {owners.map((o) => (
          <li key={o.guestyId} className="flex items-center justify-between">
            <span className="text-mvr-olive">{o.name}</span>
            <span className={`text-xs ${o.mapped ? 'text-mvr-success' : 'text-muted-foreground/60'}`}>
              {o.mapped ? 'Mapped' : 'Unmapped'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
