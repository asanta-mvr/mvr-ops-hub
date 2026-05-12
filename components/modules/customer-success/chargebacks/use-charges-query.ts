'use client'

import { useEffect, useState } from 'react'
import type { ExpandableCharge } from './ExpandableChargesTable'

interface Args {
  initial: ExpandableCharge[]
  selectedReasons: string[]
  year?: number
  month?: number
}

interface Result {
  charges: ExpandableCharge[]
  loading: boolean
  error: string | null
}

// Fetches charges from /api/v1/risk/charges when reasons are selected; otherwise returns the
// server-rendered initial high-risk list. Shared by RepeatAttemptsPanel + ExpandableChargesTable
// so both views always see the same dataset.
export function useChargesQuery({ initial, selectedReasons, year, month }: Args): Result {
  const [charges, setCharges] = useState<ExpandableCharge[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filterKey = `${year ?? 'all'}-${month ?? 'all'}-${[...selectedReasons].sort().join(',')}`

  useEffect(() => {
    if (selectedReasons.length === 0) {
      setCharges(initial)
      setError(null)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    const params = new URLSearchParams()
    if (year) params.set('year', String(year))
    if (month) params.set('month', String(month))
    params.set('reasons', selectedReasons.join(','))
    params.set('limit', '200')
    fetch(`/api/v1/risk/charges?${params.toString()}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return
        if (json.error) {
          setError(json.error)
          setCharges([])
        } else {
          setCharges(
            (json.data as ExpandableCharge[]).map((c) => ({
              ...c,
              createdAt: typeof c.createdAt === 'string' ? new Date(c.createdAt) : c.createdAt,
            }))
          )
        }
      })
      .catch((e) => {
        if (cancelled) return
        console.error(e)
        setError('Failed to load charges')
        setCharges([])
      })
      .finally(() => {
        if (cancelled) return
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // filterKey covers year, month, and selectedReasons
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  return { charges, loading, error }
}
