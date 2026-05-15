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
import { parseReviewFilters, type ReviewsSearchParams } from '@/lib/reviews/filters'
import type { ReviewWithAction } from '@/lib/reviews/types'
import { ReviewsClient } from '@/components/modules/customer-success/reviews/ReviewsClient'

export const metadata: Metadata = { title: 'Reviews' }

// Page reads BigQuery + ops-hub Postgres live; never cached at the route level.
export const dynamic    = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  searchParams: ReviewsSearchParams
}

// Filter keys that count as "user has expressed intent". Page navigation
// fields (page/pageSize) are excluded.
const FILTER_KEYS: ReadonlyArray<keyof ReviewsSearchParams> = ['year', 'building', 'unit', 'ota', 'stars', 'q']

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

async function renderReviewsPage(searchParams: ReviewsSearchParams) {
  const session = await auth()
  await requireView(session, 'customer_success.reviews', '/no-access')

  // First-entry defaults — when no filter param is present in the URL we
  // redirect to the canonical default scope (current year + our managed
  // buildings). Users can still deselect items afterwards; the redirect
  // only fires when the URL is truly empty.
  const hasAnyFilter = FILTER_KEYS.some((k) => searchParams[k] !== undefined)
  if (!hasAnyFilter) {
    const defaults = new URLSearchParams()
    defaults.set('year', '2026')
    defaults.set('building', 'Arya,District,Elser,Icon,Natiivo')
    redirect(`/customer-success/reviews?${defaults.toString()}`)
  }

  const filters = parseReviewFilters(searchParams)

  const [
    { rows, totalCount },
    summary,
    heatmap,
    dailyVolume,
    tagDistribution,
    rawDisputeStats,
    bqOptions,
    latestGood,
    latestBad,
    assignees,
  ] = await Promise.all([
    fetchReviewsList(filters),
    fetchReviewsKPIs(filters),
    fetchHeatmap(filters, 'building', 'week'),
    fetchDailyVolume(filters),
    fetchTagDistribution(filters),
    getDisputeStats(),
    fetchFilterOptions(),
    fetchLatestForBucket(filters, { ratingGte: 4, limit: 5 }),
    fetchLatestForBucket(filters, { ratingLte: 3, limit: 5 }),
    db.user.findMany({
      where:   { role: { in: ['super_admin', 'operations_manager', 'cx_agent'] }, isActive: true },
      select:  { id: true, name: true, email: true },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
    }),
  ])

  // Compose dispute stats with the page-only `disputedPct` derived field.
  const disputedTotal = rawDisputeStats.disputingNow + rawDisputeStats.wonYtd + rawDisputeStats.lostYtd + rawDisputeStats.closedYtd
  const disputeStats = {
    ...rawDisputeStats,
    disputedPct: summary.totalReviews > 0 ? disputedTotal / summary.totalReviews : null,
  }

  // Single round-trip — pull actions for the main page + both Latest panels.
  const actionKeys = [...rows, ...latestGood, ...latestBad].map((r) => ({
    otaSource:        r.otaSource,
    externalReviewId: r.id,
  }))
  const actions = await getActionsForReviews(actionKeys)

  function withAction(r: typeof rows[number]): ReviewWithAction {
    return { ...r, action: actions.get(`${r.otaSource}::${r.id}`) ?? null }
  }
  const initialLatestGood: ReviewWithAction[] = latestGood.map(withAction)
  const initialLatestBad:  ReviewWithAction[] = latestBad.map(withAction)

  const merged: ReviewWithAction[] = rows.map((r) => ({
    ...r,
    action: actions.get(`${r.otaSource}::${r.id}`) ?? null,
  }))

  // Narrow the OTA filter strings → typed OtaSource[] for the client.
  const KNOWN_OTAS: OtaSource[] = ['airbnb', 'booking', 'vrbo', 'expedia', 'vacasa', 'other']
  const typedOtas = (filters.otas as string[]).filter(
    (o): o is OtaSource => (KNOWN_OTAS as string[]).includes(o)
  )

  return (
    <div className="space-y-5 max-w-screen-2xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Live guest reviews from{' '}
          <code className="text-xs">miami-vr-data.reva_reviews.reviews</code>{' '}
          (all OTA channels). Triage low-rated reviews and track the dispute pipeline.
          {summary.etlLoadedAt ? (
            <>
              {' '}<span className="text-xs text-mvr-olive">
                Last ETL load {new Date(summary.etlLoadedAt).toLocaleString()}.
              </span>
            </>
          ) : null}
        </p>
      </div>

      <ReviewsClient
        initialRows={merged}
        initialLatestGood={initialLatestGood}
        initialLatestBad={initialLatestBad}
        totalCount={totalCount}
        summary={summary}
        heatmap={heatmap}
        dailyVolume={dailyVolume}
        tagDistribution={tagDistribution}
        disputeStats={disputeStats}
        buildingOptions={bqOptions.buildings}
        unitOptions={bqOptions.units}
        otaOptions={bqOptions.otas}
        yearOptions={bqOptions.years}
        assigneeOptions={assignees.map((u) => ({
          id:   u.id,
          name: u.name ?? u.email,
        }))}
        initialFilters={{
          years:      filters.years,
          buildings:  filters.buildings,
          units:      filters.units,
          otas:       typedOtas,
          stars:      filters.stars,
          unitSearch: filters.unitSearch,
          page:       filters.page,
          pageSize:   filters.pageSize,
        }}
      />
    </div>
  )
}
