'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'
import { X, ImagePlus, GripVertical, ImageIcon, Loader2, DownloadCloud, Check } from 'lucide-react'
import CollapsibleCard from './CollapsibleCard'

export interface GalleryPhoto {
  id: string
  kind: 'guesty' | 'drive'
  url: string
  order: number
}

interface Props {
  listingId: string
  editable: boolean
  initialPhotos: GalleryPhoto[]
  guestyCount: number
  hasDriveFolder: boolean
}

export default function ListingPhotoGallery({
  listingId,
  editable,
  initialPhotos,
  guestyCount,
  hasDriveFolder,
}: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPhotos)
  const [busy, setBusy] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const patch = useCallback(
    async (body: unknown) => {
      const res = await fetch(`/api/v1/listings/${listingId}/gallery`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not update photos')
        return null
      }
      return json.data as GalleryPhoto[]
    },
    [listingId]
  )

  async function handleImport() {
    setBusy(true)
    const next = await patch({ op: 'import' })
    if (next) {
      setPhotos(next)
      toast.success('Imported photos from Guesty')
    }
    setBusy(false)
  }

  async function handleRemove(photoId: string) {
    setBusy(true)
    try {
      const res = await fetch(`/api/v1/listings/${listingId}/gallery?photoId=${encodeURIComponent(photoId)}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json?.error ?? 'Could not remove photo')
        return
      }
      setPhotos(json.data as GalleryPhoto[])
      toast.success('Photo removed')
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    const next = arrayMove(photos, oldIndex, newIndex)
    setPhotos(next) // optimistic
    const saved = await patch({ op: 'reorder', orderedIds: next.map((p) => p.id) })
    if (saved) setPhotos(saved)
  }

  async function handleAddFromDrive(fileIds: string[]) {
    if (fileIds.length === 0) return
    setBusy(true)
    const next = await patch({ op: 'addFromDrive', fileIds })
    if (next) {
      setPhotos(next)
      toast.success(`Added ${fileIds.length} photo${fileIds.length > 1 ? 's' : ''}`)
    }
    setBusy(false)
    setPickerOpen(false)
  }

  return (
    <>
      <CollapsibleCard
        title={`Photos (${photos.length})`}
        actions={
          editable ? (
            <>
              {photos.length === 0 && guestyCount > 0 && (
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#E0DBD4] px-3 py-1.5 text-xs font-medium text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:opacity-50"
                >
                  <DownloadCloud className="size-3.5" />
                  Import {guestyCount} from Guesty
                </button>
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={busy || !hasDriveFolder}
                title={hasDriveFolder ? 'Pick photos from the unit Drive folder' : 'Attach a unit with a Drive folder first'}
                className="inline-flex items-center gap-1.5 rounded-full bg-mvr-primary px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-mvr-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ImagePlus className="size-3.5" />
                Add from Drive
              </button>
            </>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {!hasDriveFolder && editable && (
            <p className="text-xs text-muted-foreground">
              Attach a unit with a Drive folder to add photos from your library.
            </p>
          )}

          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#E0DBD4] py-10 text-center">
              <ImageIcon className="size-6 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                {guestyCount > 0 ? 'No photos yet — import them from Guesty to start.' : 'No photos.'}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {photos.map((p, i) => (
                    <SortablePhoto
                      key={p.id}
                      photo={p}
                      index={i}
                      editable={editable}
                      busy={busy}
                      onRemove={() => handleRemove(p.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </CollapsibleCard>

      {pickerOpen && (
        <DrivePicker listingId={listingId} onClose={() => setPickerOpen(false)} onConfirm={handleAddFromDrive} />
      )}
    </>
  )
}

function SortablePhoto({
  photo,
  index,
  editable,
  busy,
  onRemove,
}: {
  photo: GalleryPhoto
  index: number
  editable: boolean
  busy: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative aspect-square overflow-hidden rounded-lg border border-[#E0DBD4] bg-mvr-neutral"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" className="size-full object-cover" />

      <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
        {index + 1}
      </span>

      {editable && (
        <>
          <button
            type="button"
            {...attributes}
            {...listeners}
            title="Drag to reorder"
            className="absolute bottom-1.5 left-1.5 cursor-grab rounded bg-black/55 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          >
            <GripVertical className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={busy}
            title="Remove from this listing (keeps the file in Drive)"
            className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-mvr-danger group-hover:opacity-100 disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        </>
      )}
    </div>
  )
}

interface DriveImage {
  fileId: string
  name: string
  url: string
  added: boolean
}

function DrivePicker({
  listingId,
  onClose,
  onConfirm,
}: {
  listingId: string
  onClose: () => void
  onConfirm: (fileIds: string[]) => void
}) {
  const [loading, setLoading] = useState(true)
  const [images, setImages] = useState<DriveImage[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/v1/listings/${listingId}/gallery/drive`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json?.error ?? 'Could not load the Drive folder')
        } else if (!json.data.folder) {
          setError('No Drive folder on the attached unit.')
        } else {
          setImages(json.data.images as DriveImage[])
          if (json.data.error) setError(json.data.error)
        }
      } catch {
        if (!cancelled) setError('Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [listingId])

  const toggle = (fileId: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) next.delete(fileId)
      else next.add(fileId)
      return next
    })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#E0DBD4] px-5 py-3">
          <h3 className="font-display text-lg text-mvr-primary">Add photos from Drive</h3>
          <button type="button" onClick={onClose} className="text-muted-foreground/70 hover:text-mvr-olive">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading Drive folder…
            </div>
          )}
          {!loading && error && images.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">{error}</p>
          )}
          {!loading && images.length > 0 && (
            <>
              {error && <p className="mb-3 text-xs text-mvr-warning">{error}</p>}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {images.map((img) => {
                  const isSel = selected.has(img.fileId)
                  return (
                    <button
                      key={img.fileId}
                      type="button"
                      disabled={img.added}
                      onClick={() => toggle(img.fileId)}
                      title={img.added ? 'Already added' : img.name}
                      className={`group relative aspect-square overflow-hidden rounded-lg border-2 transition-colors ${
                        img.added
                          ? 'cursor-not-allowed border-transparent opacity-40'
                          : isSel
                            ? 'border-mvr-primary'
                            : 'border-transparent hover:border-mvr-steel'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="size-full object-cover" />
                      {(isSel || img.added) && (
                        <span className="absolute right-1 top-1 rounded-full bg-mvr-primary p-0.5 text-white">
                          <Check className="size-3" />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E0DBD4] px-5 py-3">
          <span className="text-xs text-muted-foreground">{selected.size} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[#E0DBD4] px-4 py-1.5 text-sm text-mvr-olive transition-colors hover:bg-mvr-neutral/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onConfirm(Array.from(selected))}
              disabled={selected.size === 0}
              className="rounded-full bg-mvr-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-mvr-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add {selected.size > 0 ? selected.size : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
