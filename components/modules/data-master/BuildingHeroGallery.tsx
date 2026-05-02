'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, X, Images, Pencil, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BuildingHeroGalleryProps {
  urls:         string[]
  buildingName: string
  nickname?:    string | null
  status:       string
  zone?:        string | null
  buildingId:   string
  statusClass:  string
}

export default function BuildingHeroGallery({
  urls,
  buildingName,
  nickname,
  status,
  zone,
  buildingId,
  statusClass,
}: BuildingHeroGalleryProps) {
  const [open, setOpen]       = useState(false)
  const [idx, setIdx]         = useState(0)
  const stripRef              = useRef<HTMLDivElement>(null)

  const hasPhotos = urls.length > 0

  const openAt = (i: number) => { setIdx(i); setOpen(true) }
  const close  = () => setOpen(false)

  const prev = useCallback(() =>
    setIdx(i => (i - 1 + urls.length) % urls.length),
    [urls.length]
  )
  const next = useCallback(() =>
    setIdx(i => (i + 1) % urls.length),
    [urls.length]
  )

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape')     close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, prev, next])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (!open || !stripRef.current) return
    const thumb = stripRef.current.children[idx] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [idx, open])

  // Touch swipe support
  const touchStartX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta < -50) next()
    if (delta >  50) prev()
    touchStartX.current = null
  }

  return (
    <>
      {/* ── Hero image area ─────────────────────────────────── */}
      <div className="h-44 md:h-52 w-full relative">
        {hasPhotos ? (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute inset-0 w-full h-full cursor-zoom-in focus:outline-none"
            aria-label="View building photos"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={urls[0]}
              alt={buildingName}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </button>
        ) : (
          <div className="absolute inset-0 bg-mvr-primary/10 flex items-center justify-center">
            <Building2 className="w-14 h-14 text-mvr-primary/20" />
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-mvr-primary/60 via-transparent to-transparent pointer-events-none" />

        {/* Photo count badge */}
        {urls.length > 1 && (
          <button
            type="button"
            onClick={() => openAt(0)}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs px-2.5 py-1.5 rounded-full backdrop-blur-sm transition-colors"
          >
            <Images className="w-3.5 h-3.5" />
            {urls.length} photos
          </button>
        )}

        {/* Building info overlay */}
        <div className="absolute bottom-4 left-5 right-5 z-10 flex items-end justify-between pointer-events-none">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClass}`}>
                {status}
              </span>
              {zone && (
                <span className="text-white/80 text-xs bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
                  {zone}
                </span>
              )}
            </div>
            <h1 className="font-display text-2xl font-bold text-white drop-shadow">{buildingName}</h1>
            {nickname && (
              <p className="text-white/70 text-sm mt-0.5">{nickname}</p>
            )}
          </div>
          <Link href={`/data-master/buildings/${buildingId}/edit`} className="pointer-events-auto">
            <Button size="sm" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm">
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Lightbox ────────────────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col select-none">

          {/* Top bar */}
          <div className="flex items-center justify-between px-5 py-3 shrink-0">
            <p className="text-white/60 text-sm truncate max-w-[50%]">{buildingName}</p>
            <span className="text-white text-sm font-medium tabular-nums">
              {idx + 1} / {urls.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="text-white/60 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main image */}
          <div
            className="flex-1 relative flex items-center justify-center min-h-0 px-14"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {urls.length > 1 && (
              <button
                type="button"
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 active:bg-white/40 text-white rounded-full p-2.5 transition-colors z-10"
                aria-label="Previous photo"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={urls[idx]}
              src={urls[idx]}
              alt={`${buildingName} — photo ${idx + 1}`}
              referrerPolicy="no-referrer"
              className="max-h-full max-w-full object-contain rounded-lg"
              draggable={false}
            />

            {urls.length > 1 && (
              <button
                type="button"
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/25 active:bg-white/40 text-white rounded-full p-2.5 transition-colors z-10"
                aria-label="Next photo"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {urls.length > 1 && (
            <div className="shrink-0 py-3 px-4">
              <div
                ref={stripRef}
                className="flex gap-2 overflow-x-auto justify-center pb-1 scrollbar-none"
                style={{ scrollbarWidth: 'none' }}
              >
                {urls.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIdx(i)}
                    aria-label={`Photo ${i + 1}`}
                    className={[
                      'shrink-0 w-16 h-12 rounded-md overflow-hidden transition-all',
                      i === idx
                        ? 'ring-2 ring-white opacity-100 scale-105'
                        : 'opacity-40 hover:opacity-75',
                    ].join(' ')}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Thumbnail ${i + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                      draggable={false}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
