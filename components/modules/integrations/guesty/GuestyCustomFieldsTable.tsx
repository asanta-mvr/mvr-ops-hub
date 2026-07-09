'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, SlidersHorizontal } from 'lucide-react'

export interface GuestyCustomFieldRow {
  id: string
  guestyId: string
  displayName: string
  key: string | null
  objectType: string
  type: string
  options: string[]
  isPublic: boolean | null
  syncedAt: string
}

export default function GuestyCustomFieldsTable({
  initialRows,
  connected,
  editable,
}: {
  initialRows: GuestyCustomFieldRow[]
  connected: boolean
  editable: boolean
}) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/v1/integrations/guesty/custom-fields/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Custom field sync failed')
        return
      }
      toast.success(`Pulled ${json.data?.synced ?? 0} custom fields from Guesty`)
      router.refresh()
    } catch {
      toast.error('Network error during custom field sync')
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Custom field definitions from Guesty. Values are attached per listing and appear on the
          listing and its unit after a push to Data Master.
        </p>
        {editable && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!connected || refreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-mvr-primary px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-mvr-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh custom fields
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E0DBD4] bg-white shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#E0DBD4] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Field</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Object</th>
              <th className="px-4 py-3 font-medium">Options</th>
              <th className="px-4 py-3 font-medium">Visibility</th>
            </tr>
          </thead>
          <tbody>
            {initialRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No custom fields yet. Click <span className="font-medium">Refresh custom fields</span> to pull them from Guesty.
                </td>
              </tr>
            )}
            {initialRows.map((row) => (
              <tr key={row.id} className="border-b border-[#E0DBD4]/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4 shrink-0 text-mvr-steel" />
                    <span className="font-medium text-mvr-olive">{row.displayName}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.key ? <span className="font-mono text-xs">{row.key}</span> : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-full bg-mvr-neutral px-2 py-0.5 text-xs text-mvr-olive">
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{row.objectType}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.options.length ? row.options.join(', ') : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.isPublic == null ? '—' : row.isPublic ? 'Public' : 'Private'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
