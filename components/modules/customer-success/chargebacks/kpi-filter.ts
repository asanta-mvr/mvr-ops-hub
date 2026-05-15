// Shared types and helpers for the clickable KPI cards in the Payments tab.
// Each KPI maps to a server-side filter via kpiToParams(); the strip and the
// charges query both reference this single source of truth.

export type KpiFilter = 'succeeded' | 'failed' | 'failRate' | 'highRisk' | null

export const KPI_LABEL: Record<Exclude<KpiFilter, null>, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  failRate: 'Failed (rate)',
  highRisk: 'High risk',
}

// Map a KPI selection to /api/v1/risk/charges query parameters.
// Returns an empty object for null (no filter).
export function kpiToParams(kpi: KpiFilter): Record<string, string> {
  if (kpi === null) return {}
  if (kpi === 'succeeded') return { status: 'succeeded' }
  if (kpi === 'failed' || kpi === 'failRate') return { status: 'failed' }
  if (kpi === 'highRisk') return { riskLevel: 'elevated,highest' }
  return {}
}

// Used by the client to filter the initial server-rendered set without re-fetching
// when possible. Returns true if the row passes the KPI filter.
export function matchesKpi(
  kpi: KpiFilter,
  row: { status: string; riskLevel: string | null }
): boolean {
  if (kpi === null) return true
  if (kpi === 'succeeded') return row.status === 'succeeded'
  if (kpi === 'failed' || kpi === 'failRate') return row.status === 'failed'
  if (kpi === 'highRisk') return row.riskLevel === 'elevated' || row.riskLevel === 'highest'
  return true
}
