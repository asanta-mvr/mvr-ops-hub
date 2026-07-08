import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { db } from '@/lib/db'

export const metadata: Metadata = { title: 'Integrations' }
export const dynamic = 'force-dynamic'

const integrations = [
  { name: 'Guesty', description: 'PMS — reservations, listings, owner financials', phase: 2, logo: '/icons/integration-guesty.png', href: '/integrations/guesty' },
  { name: 'Stripe', description: 'Payment processing and chargeback management', phase: 3, logo: '/icons/integration-stripe.png' },
  { name: 'SuiteOp', description: 'Guest experience and operational tasks', phase: 4, logo: '/icons/integration-suiteop.png' },
  { name: 'Breezeway', description: 'Housekeeping and maintenance task management', phase: 4, logo: '/icons/integration-breezeway.png' },
  { name: 'Brivo', description: 'Smart lock and access control management', phase: 4, logo: '/icons/integration-brivo.png' },
  { name: 'Trellis', description: 'AI-native operations — tasks, workforce, reservations', phase: 4, logo: '/icons/integration-trellis.png' },
  { name: 'Slack', description: 'Internal team notifications and alerts', phase: 1, logo: '/icons/integration-slack.png', href: '/integrations/slack' },
  { name: 'N8N', description: 'Workflow automation and process orchestration', phase: 6, logo: '/icons/integration-n8n.png' },
] as const

function StatusDot({ status }: { status: 'connected' | 'error' | 'pending' }) {
  const cls =
    status === 'connected' ? 'bg-mvr-success' : status === 'error' ? 'bg-mvr-danger' : 'bg-mvr-warning'
  const label = status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Pending'
  return (
    <div className="flex items-center gap-1.5">
      <div className={`size-2 rounded-full ${cls}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

export default async function IntegrationsPage() {
  const [guesty, slack] = await Promise.all([
    db.guestyConnection.findFirst({ orderBy: { createdAt: 'asc' } }),
    db.slackConnection.findFirst({ orderBy: { createdAt: 'asc' } }),
  ])
  const guestyStatus: 'connected' | 'error' | 'pending' =
    guesty?.status === 'connected' ? 'connected' : guesty?.status === 'error' ? 'error' : 'pending'
  const slackStatus: 'connected' | 'error' | 'pending' =
    slack?.status === 'connected' ? 'connected' : slack?.status === 'error' ? 'error' : 'pending'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-mvr-primary">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect external systems. Guesty is live — others activate per phase.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {integrations.map((item) => {
          const isGuesty = item.name === 'Guesty'
          const status = isGuesty ? guestyStatus : item.name === 'Slack' ? slackStatus : 'pending'
          const lastSync =
            isGuesty && guesty?.lastSyncAt
              ? `${guesty.lastSyncCount ?? 0} listings · ${new Date(guesty.lastSyncAt).toLocaleDateString()}`
              : null

          const card = (
            <div
              className={`flex h-full flex-col justify-between rounded-xl border border-[#E0DBD4] bg-white p-5 transition-all ${
                'href' in item ? 'hover:-translate-y-0.5 hover:shadow-card-hover' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E0DBD4] bg-mvr-cream p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.logo}
                      alt={`${item.name} logo`}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-mvr-olive">{item.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-mvr-neutral px-2 py-0.5 text-xs text-muted-foreground">
                  Phase {item.phase}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <StatusDot status={status} />
                {lastSync && <span className="text-xs text-muted-foreground/70">{lastSync}</span>}
                {'href' in item && !lastSync && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-mvr-primary">
                    Configure <ArrowRight className="size-3" />
                  </span>
                )}
              </div>
            </div>
          )

          return 'href' in item ? (
            <Link key={item.name} href={item.href} className="block focus-visible:outline-none">
              {card}
            </Link>
          ) : (
            <div key={item.name}>{card}</div>
          )
        })}
      </div>
    </div>
  )
}
