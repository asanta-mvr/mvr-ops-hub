'use client'

import { useState, useRef } from 'react'

interface PhotoGalleryProps {
  urls: string[]
}

export default function PhotoGallery({ urls }: PhotoGalleryProps) {
  const [selected, setSelected] = useState(0)
  const stripRef = useRef<HTMLDivElement>(null)

  if (urls.length === 0) return null

  const mainUrl = urls[selected]

  function pick(index: number) {
    setSelected(index)
    // Scroll the thumbnail into view within the strip
    const strip = stripRef.current
    if (!strip) return
    const thumb = strip.children[index] as HTMLElement | undefined
    thumb?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  return (
    <div className="space-y-2">
      {/* Main photo */}
      <div
        className="w-full aspect-video rounded-xl bg-mvr-neutral bg-cover bg-center"
        style={{ backgroundImage: `url(${mainUrl})` }}
      />

      {/* Thumbnail strip — only shown when there is more than one photo */}
      {urls.length > 1 && (
        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-mvr-neutral"
        >
          {urls.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              className={[
                'shrink-0 w-20 aspect-video rounded-lg bg-cover bg-center bg-mvr-neutral transition-all',
                i === selected
                  ? 'ring-2 ring-mvr-primary ring-offset-1 opacity-100'
                  : 'opacity-60 hover:opacity-90',
              ].join(' ')}
              style={{ backgroundImage: `url(${url})` }}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
