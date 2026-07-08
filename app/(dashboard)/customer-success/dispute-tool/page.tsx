import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { requireView } from '@/lib/auth/permissions'
import { listCases } from '@/lib/disputes/cases'
import { listKnowledge } from '@/lib/disputes/knowledge'
import { listSections } from '@/lib/disputes/sections'
import { listCaseTypeDefs } from '@/lib/disputes/caseTypes'
import { getAgentConfigRecord, listVersions, listSkills } from '@/lib/disputes/agent'
import { DisputeToolClient } from '@/components/modules/customer-success/dispute-tool/DisputeToolClient'

export const metadata: Metadata = { title: 'Dispute Tool' }

// Reads ops-hub Postgres live; never cached at the route level.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DisputeToolPage() {
  const session = await auth()
  await requireView(session, 'customer_success.dispute_tool', '/no-access')

  const [
    initialCases,
    initialKnowledge,
    initialSections,
    initialCaseTypes,
    initialAgentConfig,
    initialAgentVersions,
    initialSkills,
  ] = await Promise.all([
    listCases({}),
    listKnowledge(),
    listSections(),
    listCaseTypeDefs(),
    getAgentConfigRecord(),
    listVersions(),
    listSkills(),
  ])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Dispute Tool</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          AI adjudication for guest review removals and OTA disputes across Airbnb, Booking, Vrbo,
          and Expedia. Analyze a case for win-probability metrics and a strategy, track it to
          resolution, and maintain the agent&apos;s knowledge base.
        </p>
      </div>

      <DisputeToolClient
        initialCases={initialCases}
        initialKnowledge={initialKnowledge}
        initialSections={initialSections}
        initialCaseTypes={initialCaseTypes}
        initialAgentConfig={initialAgentConfig}
        initialAgentVersions={initialAgentVersions}
        initialSkills={initialSkills}
      />
    </div>
  )
}
