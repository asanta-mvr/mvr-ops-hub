import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Database,
  FileText,
  Gavel,
  HeadphonesIcon,
  Home,
  MessagesSquare,
  Plug,
  RefreshCw,
  Star,
  Ticket,
  Users,
  UserX,
} from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { computeUnitAndKeyCount } from '@/lib/utils/unit-counts'
import { OverviewStatCard } from '@/components/modules/dashboard/OverviewStatCard'

export const metadata: Metadata = { title: 'Dashboard' }

async function getOverviewMetrics() {
  const [
    buildings,
    onboardingBuildings,
    activeUnitNumbers,
    owners,
    listings,
    unlinkedListings,
    openTickets,
    reviewsToAction,
    activeDisputes,
    disputeCases,
    guesty,
    slack,
    slackChannels,
    guestyListings,
    unmappedGuestyOwners,
  ] = await Promise.all([
    db.building.count({ where: { status: { not: 'inactive' } } }),
    db.building.count({ where: { status: 'onboarding' } }),
    db.unit.findMany({ where: { status: { not: 'inactive' } }, select: { number: true } }),
    db.owner.count({ where: { status: 'active' } }),
    db.listing.count(),
    db.listing.count({ where: { unitId: null } }),
    db.supportTicket.count({
      where: { status: { in: ['open', 'in_progress', 'pending_guest', 'pending_ota'] } },
    }),
    db.reviewAction.count({ where: { status: { in: ['new', 'under_review'] } } }),
    db.reviewAction.count({ where: { status: 'disputing' } }),
    db.disputeCase.count(),
    db.guestyConnection.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.slackConnection.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.slackChannel.count({ where: { isArchived: false } }),
    db.guestyListing.count(),
    db.guestyOwner.count({ where: { ownerUniqueId: null } }),
  ])

  const { keyCount } = computeUnitAndKeyCount(activeUnitNumbers.map((u) => u.number))

  return {
    buildings,
    onboardingBuildings,
    activeUnits: activeUnitNumbers.length,
    keyCount,
    owners,
    listings,
    unlinkedListings,
    openTickets,
    reviewsToAction,
    activeDisputes,
    disputeCases,
    guesty,
    slack,
    slackChannels,
    guestyListings,
    unmappedGuestyOwners,
  }
}

type ConnStatus = 'connected' | 'error' | 'disconnected'

function connState(raw: string | undefined): { value: string; dot: 'success' | 'danger' | 'warning' } {
  const status: ConnStatus = raw === 'connected' ? 'connected' : raw === 'error' ? 'error' : 'disconnected'
  if (status === 'connected') return { value: 'Connected', dot: 'success' }
  if (status === 'error') return { value: 'Error', dot: 'danger' }
  return { value: 'Disconnected', dot: 'warning' }
}

function fmtDate(d: Date | null | undefined): string | null {
  return d ? new Date(d).toLocaleDateString() : null
}

function MetricGroup({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-mvr-primary/70" />
        <h2 className="text-sm font-semibold text-mvr-primary">{title}</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{children}</div>
    </section>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const m = await getOverviewMetrics()

  const guesty = connState(m.guesty?.status)
  const slack = connState(m.slack?.status)
  const guestySub = m.guesty?.lastSyncAt
    ? `${m.guesty.lastSyncCount ?? 0} synced · ${fmtDate(m.guesty.lastSyncAt)}`
    : 'not yet synced'
  const slackSub = m.slack?.lastSyncAt
    ? `${m.slackChannels} channels · ${fmtDate(m.slack.lastSyncAt)}`
    : `${m.slackChannels} channels`

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">
          Welcome back, {session?.user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening at Miami Vacation Rentals
        </p>
      </div>

      <MetricGroup title="Data Master" icon={Database}>
        <OverviewStatCard
          label="Active Buildings"
          value={m.buildings}
          sub={m.onboardingBuildings > 0 ? `${m.onboardingBuildings} onboarding` : undefined}
          icon={Building2}
          color="text-mvr-primary"
        />
        <OverviewStatCard
          label="Active Units"
          value={m.activeUnits}
          sub={`${m.keyCount} keys`}
          icon={Home}
          color="text-mvr-success"
        />
        <OverviewStatCard label="Active Owners" value={m.owners} icon={Users} color="text-mvr-warning" />
        <OverviewStatCard
          label="Listings"
          value={m.listings}
          sub={m.unlinkedListings > 0 ? `${m.unlinkedListings} not linked to a unit` : undefined}
          icon={FileText}
          color="text-purple-600"
        />
      </MetricGroup>

      <MetricGroup title="Customer Success" icon={HeadphonesIcon}>
        <OverviewStatCard label="Open Tickets" value={m.openTickets} icon={Ticket} color="text-mvr-primary" />
        <OverviewStatCard
          label="Reviews to Action"
          value={m.reviewsToAction}
          icon={Star}
          color="text-mvr-warning"
        />
        <OverviewStatCard
          label="Active Disputes"
          value={m.activeDisputes}
          icon={Gavel}
          color="text-mvr-danger"
        />
        <OverviewStatCard label="Dispute Cases" value={m.disputeCases} icon={Gavel} color="text-mvr-steel" />
      </MetricGroup>

      <MetricGroup title="Integrations" icon={Plug}>
        <OverviewStatCard
          label="Guesty"
          value={guesty.value}
          dot={guesty.dot}
          sub={guestySub}
          icon={Building2}
          color="text-mvr-primary"
        />
        <OverviewStatCard
          label="Slack"
          value={slack.value}
          dot={slack.dot}
          sub={slackSub}
          icon={MessagesSquare}
          color="text-mvr-primary"
        />
        <OverviewStatCard
          label="Listings Synced"
          value={m.guestyListings}
          sub="from Guesty"
          icon={RefreshCw}
          color="text-mvr-success"
        />
        <OverviewStatCard
          label="Unmapped Owners"
          value={m.unmappedGuestyOwners}
          sub={m.unmappedGuestyOwners > 0 ? 'awaiting mapping' : 'all mapped'}
          icon={UserX}
          color="text-mvr-warning"
        />
      </MetricGroup>
    </div>
  )
}
