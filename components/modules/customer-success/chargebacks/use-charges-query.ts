'use client'

import { useEffect, useState } from 'react'
import type { ExpandableCharge } from './ExpandableChargesTable'

interface Args {
  initial: ExpandableCharge[]
  selectedReasons: string[]
  year?: number
  month?: number
  buildings: string[]
  chargeTypes: string[]
  riskLevels: string[]
  statuses: string[]
}

interface Result {
  charges: ExpandableCharge[]
  loading: boolean
  error: string | null
}

// All scope filters (year/month/building/chargeType/riskLevel/status) live in
// the URL, which means the server re-renders `initial` whenever they change.
// We only refetch from the API when the client-only `selectedReasons` filter
// is non-empty — in that case the request carries the full scope so the
// server can apply reasons-on-top filtering.
export function useChargesQuery({
  initial,
  selectedReasons,
  year,
  month,
  buildings,
  chargeTypes,
  riskLevels,
  statuses,
}: Args): Result {
  const [charges, setCharges] = useState<ExpandableCharge[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const buildingsKey = [...buildings].sort().join(',')
  const chargeTypesKey = [...chargeTypes].sort().join(',')
  const riskLevelsKey = [...riskLevels].sort().join(',')
  const statusesKey = [...statuses].sort().join(',')
  const filterKey = `${year ?? 'all'}-${month ?? 'all'}-${buildingsKey}-${chargeTypesKey}-${riskLevelsKey}-${statusesKey}-${[...selectedReasons].sort().join(',')}`

  useEffect(() => {
    const hasReasons = selectedReasons.length > 0
    if (!hasReasons) {
      // No client-only filter — `initial` already reflects the current scope.
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
    if (buildings.length > 0) params.set('building', buildings.join(','))
    if (chargeTypes.length > 0) params.set('chargeType', chargeTypes.join(','))
    if (riskLevels.length > 0) params.set('riskLevel', riskLevels.join(','))
    if (statuses.length > 0) params.set('status', statuses.join(','))
    params.set('reasons', selectedReasons.join(','))
    params.set('limit', '500')
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
    // filterKey covers all dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey])

  return { charges, loading, error }
}
