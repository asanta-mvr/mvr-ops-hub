import type { ListingCustomField } from '@/lib/integrations/guesty'

function isUrl(v: string): boolean {
  return /^https?:\/\//i.test(v)
}

function renderValue(value: ListingCustomField['value']) {
  if (value == null || value === '') return <span className="text-muted-foreground/60">—</span>
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const str = String(value)
  if (isUrl(str)) {
    return (
      <a
        href={str}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-mvr-primary underline underline-offset-2 hover:text-mvr-primary/80"
      >
        {str}
      </a>
    )
  }
  return <span className="break-words">{str}</span>
}

/**
 * Data Master custom fields promoted from Guesty (Listing.customFields). Shown on
 * the listing detail; the same values surface on the attached unit's Listings tab.
 * Renders nothing when there are no custom fields.
 */
export default function ListingCustomFieldsCard({ customFields }: { customFields: ListingCustomField[] }) {
  if (customFields.length === 0) return null

  return (
    <div className="rounded-xl border border-[#E0DBD4] bg-white p-5 shadow-card">
      <h3 className="font-display text-lg text-mvr-primary">Custom fields</h3>
      <p className="mt-1 text-xs text-muted-foreground">Pulled from Guesty and tied to this listing.</p>
      <dl className="mt-3 space-y-2 text-sm">
        {customFields.map((cf) => (
          <div key={cf.fieldId} className="flex flex-col gap-0.5 border-t border-[#E0DBD4]/60 pt-2 first:border-0 first:pt-0 sm:flex-row sm:justify-between sm:gap-4">
            <dt className="shrink-0 text-muted-foreground">{cf.name}</dt>
            <dd className="text-mvr-olive sm:max-w-[60%] sm:text-right">{renderValue(cf.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
