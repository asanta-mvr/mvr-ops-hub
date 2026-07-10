'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface DeleteUnitButtonProps {
  unitId: string
  unitNumber: string
}

/**
 * Top-of-page delete for a unit on its full detail page. Opens a confirmation
 * modal that requires typing the word "delete" (Enter submits). On success the
 * unit is soft-deleted server-side and we return to the units list, where it no
 * longer appears.
 */
export function DeleteUnitButton({ unitId, unitNumber }: DeleteUnitButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canConfirm = confirmText.trim().toLowerCase() === 'delete' && !submitting

  function close() {
    if (submitting) return
    setOpen(false)
    setConfirmText('')
    setError(null)
  }

  async function handleDelete() {
    if (!canConfirm) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`/api/v1/units/${unitId}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(json?.error ?? 'Delete failed')
      }
      toast.success(`Unit ${unitNumber} deleted`)
      router.push('/data-master/units')
      router.refresh()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to delete unit'
      setError(msg)
      toast.error(msg)
      setSubmitting(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-mvr-danger/30 text-mvr-danger hover:bg-mvr-danger-light hover:text-mvr-danger"
      >
        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
        Delete
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#E0DBD4] bg-mvr-cream shadow-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[#E0DBD4] bg-white px-6 py-4">
              <h2 className="font-display text-lg font-bold text-mvr-primary">Delete Unit {unitNumber}?</h2>
              <button
                onClick={close}
                aria-label="Close"
                disabled={submitting}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-mvr-neutral/60 hover:text-mvr-primary disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-start gap-3 rounded-lg border border-mvr-danger/20 bg-mvr-danger-light px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mvr-danger" />
                <p className="text-sm text-mvr-olive">
                  Are you sure you want to delete <span className="font-semibold">Unit {unitNumber}</span>? It will be
                  removed from Data Master. This can&rsquo;t be undone here.
                </p>
              </div>

              <div>
                <label htmlFor="delete-confirm" className="mb-1.5 block text-sm font-medium text-mvr-olive">
                  Type <span className="rounded bg-mvr-neutral px-1 py-0.5 font-mono font-semibold">delete</span> to confirm
                </label>
                <input
                  id="delete-confirm"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleDelete()
                    }
                  }}
                  placeholder="delete"
                  autoComplete="off"
                  disabled={submitting}
                  className="w-full rounded-lg border border-[#E0DBD4] bg-white px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-mvr-primary focus:ring-2 focus:ring-mvr-primary/20 disabled:opacity-50"
                />
              </div>

              {error && <p className="text-sm text-mvr-danger">{error}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#E0DBD4] bg-white px-6 py-4">
              <Button type="button" variant="outline" size="sm" onClick={close} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleDelete()}
                disabled={!canConfirm}
                className="bg-mvr-danger text-white hover:bg-mvr-danger/90"
              >
                {submitting ? 'Deleting…' : 'Delete Unit'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
