import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Integrations' }

const integrations = [
  { name: 'Guesty', description: 'PMS — reservations, listings, owner financials', phase: 2, status: 'pending' },
  { name: 'Conduit', description: 'Owner statements and payment automation', phase: 2, status: 'pending' },
  { name: 'Stripe', description: 'Payment processing and chargeback management', phase: 3, status: 'pending' },
  { name: 'SuiteOp', description: 'Guest experience and operational tasks', phase: 4, status: 'pending' },
  { name: 'Breezeway', description: 'Housekeeping and maintenance task management', phase: 4, status: 'pending' },
  { name: 'Brivo', description: 'Smart lock and access control management', phase: 4, status: 'pending' },
  { name: 'Slack', description: 'Internal team notifications and alerts', phase: 1, status: 'pending' },
  { name: 'N8N', description: 'Workflow automation and process orchestration', phase: 6, status: 'pending' },
]

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Integrations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Webhook receivers are live and ready. Integration logic activates per phase.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {integrations.map(({ name, description, phase, status }) => (
          <div key={name} className="bg-white rounded-xl border p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
              <span className="text-xs bg-mvr-neutral text-muted-foreground px-2 py-0.5 rounded-full shrink-0 ml-3">
                Phase {phase}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-mvr-warning" />
              <span className="text-xs text-muted-foreground capitalize">{status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
