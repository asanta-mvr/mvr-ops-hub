import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ALLOWED_RISK_ROLES } from '@/lib/risk/schemas'
import { RulesClient, type RuleRow } from '@/components/modules/customer-success/chargebacks/RulesClient'

export const metadata: Metadata = { title: 'Risk · Alert Rules' }

export default async function RulesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!ALLOWED_RISK_ROLES.includes(session.user.role)) {
    redirect('/dashboard')
  }

  const rules = await db.notificationRule.findMany({
    orderBy: [{ enabled: 'desc' }, { createdAt: 'desc' }],
    include: { createdBy: { select: { name: true, email: true } } },
  })

  const initial: RuleRow[] = rules.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    criteria: r.criteria as RuleRow['criteria'],
    channel: r.channel,
    priority: r.priority as RuleRow['priority'],
    enabled: r.enabled,
    createdAt: r.createdAt.toISOString(),
    createdByName: r.createdBy.name ?? r.createdBy.email,
  }))

  return (
    <div className="space-y-5">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/customer-success/chargebacks" className="hover:text-mvr-primary">
          Risk &amp; Chargebacks
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-foreground">Alert Rules</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Alert Rules</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Define which dispute patterns trigger Slack notifications. Rules are consumed by the n8n risk workflow.
        </p>
      </div>

      <RulesClient initial={initial} />
    </div>
  )
}
