'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Activity, RefreshCw } from 'lucide-react'
import type { IngestFreshness } from '@/lib/risk/queries'

interface Props {
  freshness: IngestFreshness
}

function relativeTime(date: Date | null): string {
  if (!date) return 'never'
  const ms = Date.now() - date.getTime()
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`
  return `${Math.floor(ms / 86_400_000)}d ago`
}

export function FreshnessIndicator({ freshness }: Props) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  // Force a re-render every 30s so the relative time stays accurate without re-fetching.
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  const latestEvent =
    freshness.latestEventAt instanceof Date
      ? freshness.latestEventAt
      : freshness.latestEventAt
        ? new Date(freshness.latestEventAt)
        : null

  const stale = latestEvent ? Date.now() - latestEvent.getTime() > 60 * 60 * 1000 : true // >1h
  const veryStale = latestEvent ? Date.now() - latestEvent.getTime() > 24 * 60 * 60 * 1000 : true // >24h

  function refresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="inline-flex items-center gap-2 text-[11px] text-muted-foreground">
      <Activity
        className={`w-3.5 h-3.5 ${veryStale ? 'text-mvr-danger' : stale ? 'text-mvr-warning' : 'text-mvr-success'}`}
      />
      <span>
        Last event{' '}
        <strong className={`font-medium ${veryStale ? 'text-mvr-danger' : stale ? 'text-mvr-warning' : 'text-mvr-primary'}`}>
          {relativeTime(latestEvent)}
        </strong>
        {' '}· {freshness.eventsLast24h} in last 24h
      </span>
      <button
        type="button"
        onClick={refresh}
        disabled={refreshing}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[#E0DBD4] text-mvr-primary hover:bg-mvr-cream disabled:opacity-40 disabled:cursor-not-allowed"
        title="Re-fetch from the database"
      >
        <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  )
}
