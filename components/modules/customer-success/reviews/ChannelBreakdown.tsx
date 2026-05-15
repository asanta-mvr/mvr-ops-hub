'use client'

import Image from 'next/image'
import type { OtaSource } from '@prisma/client'
import { Star } from 'lucide-react'

interface Props {
  byOta: Array<{ otaSource: OtaSource; count: number; avgRating: number | null }>
}

const OTA_LABEL: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', vrbo: 'Vrbo',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}

// Re-uses the icons already documented in CLAUDE.md.
const OTA_ICON: Partial<Record<OtaSource, string>> = {
  airbnb:  '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  vrbo:    '/icons/ota-vrbo.png',
  expedia: '/icons/ota-expedia.png',
  other:   '/icons/ota-other.png',
}

export function ChannelBreakdown({ byOta }: Props) {
  if (byOta.length === 0) return null
  const total = byOta.reduce((s, r) => s + r.count, 0)
  const max   = Math.max(1, ...byOta.map((r) => r.count))

  return (
    <div className="bg-white border border-[#E0DBD4] rounded-xl p-4 shadow-card">
      <h3 className="text-sm font-semibold text-mvr-primary mb-3">By channel</h3>
      <ul className="space-y-2">
        {byOta.map((o) => {
          const pct      = total > 0 ? (o.count / total) * 100 : 0
          const widthPct = (o.count / max) * 100
          const icon     = OTA_ICON[o.otaSource]
          return (
            <li key={o.otaSource} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-md bg-mvr-cream flex items-center justify-center overflow-hidden flex-shrink-0">
                {icon ? (
                  <Image src={icon} alt="" width={32} height={32} className="object-contain" />
                ) : (
                  <span className="text-xs text-mvr-primary">{OTA_LABEL[o.otaSource][0]}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-mvr-primary font-medium">{OTA_LABEL[o.otaSource]}</span>
                  <span className="text-xs text-muted-foreground">
                    {o.count.toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-1.5 bg-mvr-cream rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-mvr-primary rounded-full"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </div>
              <div className="text-xs text-mvr-olive font-medium inline-flex items-center gap-0.5 w-14 justify-end">
                {o.avgRating != null ? (
                  <>
                    <Star className="w-3 h-3 fill-current text-mvr-warning" />
                    {o.avgRating.toFixed(2)}
                  </>
                ) : (
                  '—'
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
