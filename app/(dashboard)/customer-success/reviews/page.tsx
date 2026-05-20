import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import type { OtaSource } from '@prisma/client'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import { db } from '@/lib/db'
import {
  fetchDailyVolume,
  fetchFilterOptions,
  fetchHeatmap,
  fetchLatestForBucket,
  fetchReviewsKPIs,
  fetchReviewsList,
  fetchTagDistribution,
} from '@/lib/reviews/bq'
import { getActionsForReviews, getDisputeStats } from '@/lib/reviews/actions'
import {
  parseReviewFilters,
  REVIEWS_PARAM_SUFFIXES,
  REVIEWS_TAB_PREFIXES,
  type ReviewsSearchParams,
} from '@/lib/reviews/filters'
import type { ReviewFilters, ReviewWithAction } from '@/lib/reviews/types'
import { ReviewsClient } from '@/components/modules/customer-success/reviews/ReviewsClient'

export const metadata: Metadata = { title: 'Reviews' }

// Page reads BigQuery + ops-hub Postgres live; never cached at the route level.
export const dynamic    = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: ReviewsSearchParams
}

export default async function ReviewsPage({ searchParams }: PageProps) {
  try {
    return await renderReviewsPage(searchParams)
  } catch (err) {
    // Next.js redirect() throws a special error whose digest starts with
    // NEXT_REDIRECT. Let those propagate untouched so the redirect works.
    const digest = (err as { digest?: string })?.digest
    if (typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT')) {
      throw err
    }
    // Same shape for notFound() / unauthorized handlers.
    if (typeof digest === 'string' && digest.startsWith('NEXT_')) {
      throw err
    }
    // Everything else is a real crash — surface the full error to Vercel
    // runtime logs (digest is what the UI shows; this is what we read).
    console.error('[ReviewsPage] runtime crash', {
      message: err instanceof Error ? err.message : String(err),
      name:    err instanceof Error ? err.name    : undefined,
      stack:   err instanceof Error ? err.stack   : undefined,
      digest,
    })
    throw err
  }
}

const KNOWN_OTAS: OtaSource[] = ['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']
function narrowOtas(filters: ReviewFilters): OtaSource[] {
  return (filters.otas as string[]).filter(
    (o): o is OtaSource => (KNOWN_OTAS as string[]).includes(o)
  )
}

/**
 * Build a flat (un-prefixed) URL query string from a filter set so the legacy
 * /api/v1/reviews/* route handlers — which still read `year`, `building`,
 * `unit`, `ota`, `stars` without a prefix — see the correct scope when one
 * of the Overview drill-down panels calls them. Without this, the panels
 * would send the full URL (containing ov_*, pf_*, dp_*) and the API would
 * find nothing because none of those un-prefixed keys are present.
 */
function buildScopeQs(filters: ReviewFilters): string {
  const qs = new URLSearchParams()
  if (filters.years.length     > 0) qs.set('year',     filters.years.map(String).join(','))
  if (filters.buildings.length > 0) qs.set('building', filters.buildings.join(','))
  if (filters.units.length     > 0) qs.set('unit',     filters.units.join(','))
  if (filters.otas.length      > 0) qs.set('ota',      filters.otas.join(','))
  if (filters.stars.length     > 0) qs.set('stars',    filters.stars.map(String).join(','))
  return qs.toString()
}

async function renderReviewsPage(searchParams: ReviewsSearchParams) {
  const session = await auth()
  await requireView(session, 'customer_success.reviews', '/no-access')

  // First-entry defaults — when no filter param is present in the URL for ANY
  // tab we redirect to the canonical default scope (current year + our
  // managed buildings) for all three tabs at once. Users can still deselect
  // afterwards; the redirect only fires when the URL is truly empty.
  const hasAnyFilter = REVIEWS_TAB_PREFIXES.some((prefix) =>
    REVIEWS_PARAM_SUFFIXES.some((suffix) => searchParams[`${prefix}${suffix}`] !== undefined)
  )
  if (!hasAnyFilter) {
    const defaults = new URLSearchParams()
    for (const prefix of REVIEWS_TAB_PREFIXES) {
      defaults.set(`${prefix}year`,     '2026')
      defaults.set(`${prefix}building`, 'Arya,District,Elser,Icon,Natiivo')
    }
    redirect(`/customer-success/reviews?${defaults.toString()}`)
  }

  // Three independent filter sets — one per tab. Each is parsed from its own
  // URL namespace (ov_*, pf_*, dp_*) so the user can hold different scopes
  // in Overview, Performance, and Disputes simultaneously.
  const overviewFilters    = parseReviewFilters(searchParams, 'ov_')
  const performanceFilters = parseReviewFilters(searchParams, 'pf_')
  const disputesFilters    = parseReviewFilters(searchParams, 'dp_')

  const [
    overviewSummary,
    overviewHeatmap,
    overviewDailyVolume,
    overviewTagDistribution,
    overviewLatestGood,
    overviewLatestBad,
    performanceList,
    performanceSummary,
    disputesList,
    disputesSummary,
    rawDisputeStats,
    bqOptions,
    assignees,
  ] = await Promise.all([
    fetchReviewsKPIs(overviewFilters),
    fetchHeatmap(overviewFilters, 'building', 'week'),
    fetchDailyVolume(overviewFilters),
    fetchTagDistribution(overviewFilters),
    fetchLatestForBucket(overviewFilters, { ratingGte: 4, limit: 5 }),
    fetchLatestForBucket(overviewFilters, { ratingLte: 3, limit: 5 }),
    fetchReviewsList(performanceFilters),
    fetchReviewsKPIs(performanceFilters),
    fetchReviewsList(disputesFilters),
    fetchReviewsKPIs(disputesFilters),
    getDisputeStats(),
    fetchFilterOptions(),
    db.user.findMany({
      where:   { role: { in: ['super_admin', 'operations_manager', 'cx_agent'] }, isActive: true },
      select:  { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    }),
  ])

  // Compose two views of dispute stats — the `disputedPct` denominator depends
  // on the tab's review count, so each tab gets its own.
  const disputedTotal =
    rawDisputeStats.disputingNow + rawDisputeStats.wonYtd + rawDisputeStats.lostYtd + rawDisputeStats.closedYtd

  const overviewDisputeStats = {
    ...rawDisputeStats,
    disputedPct: overviewSummary.totalReviews > 0 ? disputedTotal / overviewSummary.totalReviews : null,
  }
  const disputesDisputeStats = {
    ...rawDisputeStats,
    disputedPct: disputesSummary.totalReviews > 0 ? disputedTotal / disputesSummary.totalReviews : null,
  }

  // Single action lookup spanning all four review row sources.
  const actionKeys = [
    ...performanceList.rows,
    ...disputesList.rows,
    ...overviewLatestGood,
    ...overviewLatestBad,
  ].map((r) => ({ otaSource: r.otaSource, externalReviewId: r.id }))
  const actions = await getActionsForReviews(actionKeys)

  function withAction<R extends { otaSource: OtaSource; id: string }>(r: R): R & { action: ReviewWithAction['action'] } {
    return { ...r, action: actions.get(`${r.otaSource}::${r.id}`) ?? null }
  }
  const performanceRows:   ReviewWithAction[] = performanceList.rows.map(withAction)
  const disputesRows:      ReviewWithAction[] = disputesList.rows.map(withAction)
  const initialLatestGood: ReviewWithAction[] = overviewLatestGood.map(withAction)
  const initialLatestBad:  ReviewWithAction[] = overviewLatestBad.map(withAction)

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live guest reviews from{' '}
          <code className="text-xs">miami-vr-data.reva_reviews.reviews</code>{' '}
          (all OTA channels). Triage low-rated reviews and track the dispute pipeline.
          {overviewSummary.etlLoadedAt ? (
            <>
              {' '}<span className="text-xs text-mvr-olive">
                Last ETL load {new Date(overviewSummary.etlLoadedAt).toLocaleString()}.
              </span>
            </>
          ) : null}
        </p>
      </div>

      <ReviewsClient
        buildingOptions={bqOptions.buildings}
        unitOptions={bqOptions.units}
        otaOptions={bqOptions.otas}
        yearOptions={bqOptions.years}
        assigneeOptions={assignees.map((u) => ({
          id:   u.id,
          name: u.name ?? u.email,
        }))}
        overviewFilters={{
          years:     overviewFilters.years,
          buildings: overviewFilters.buildings,
          units:     overviewFilters.units,
          otas:      narrowOtas(overviewFilters),
          stars:     overviewFilters.stars,
        }}
        performanceFilters={{
          years:     performanceFilters.years,
          buildings: performanceFilters.buildings,
          units:     performanceFilters.units,
          otas:      narrowOtas(performanceFilters),
          stars:     performanceFilters.stars,
          page:      performanceFilters.page,
          pageSize:  performanceFilters.pageSize,
        }}
        disputesFilters={{
          years:     disputesFilters.years,
          buildings: disputesFilters.buildings,
          units:     disputesFilters.units,
          otas:      narrowOtas(disputesFilters),
          stars:     disputesFilters.stars,
        }}
        overviewScopeParams={buildScopeQs(overviewFilters)}
        overviewData={{
          summary:           overviewSummary,
          heatmap:           overviewHeatmap,
          dailyVolume:       overviewDailyVolume,
          tagDistribution:   overviewTagDistribution,
          initialLatestGood,
          initialLatestBad,
          disputeStats:      overviewDisputeStats,
        }}
        performanceData={{
          rows:       performanceRows,
          totalCount: performanceList.totalCount,
          summary:    performanceSummary,
        }}
        disputesData={{
          rows:         disputesRows,
          disputeStats: disputesDisputeStats,
        }}
      />
    </div>
  )
}
