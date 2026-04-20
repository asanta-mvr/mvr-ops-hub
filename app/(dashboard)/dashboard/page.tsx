import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { Building2, Home, Users, FileText } from 'lucide-react'

export const metadata: Metadata = { title: 'Dashboard' }

async function getStats() {
  const [buildings, units, owners, listings] = await Promise.all([
    db.building.count({ where: { status: { not: 'inactive' } } }),
    db.unit.count({ where: { status: { not: 'inactive' } } }),
    db.owner.count({ where: { status: 'active' } }),
    db.listing.count(),
  ])
  return { buildings, units, owners, listings }
}

const statCards = [
  { label: 'Active Buildings', key: 'buildings' as const, icon: Building2, color: 'text-mvr-primary' },
  { label: 'Active Units', key: 'units' as const, icon: Home, color: 'text-mvr-success' },
  { label: 'Active Owners', key: 'owners' as const, icon: Users, color: 'text-mvr-warning' },
  { label: 'Listings', key: 'listings' as const, icon: FileText, color: 'text-purple-600' },
]

export default async function DashboardPage() {
  const session = await auth()
  const stats = await getStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">
          Welcome back, {session?.user?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s what&apos;s happening at Miami Vacation Rentals
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, key, icon: Icon, color }) => (
          <div key={key} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-gray-50 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats[key]}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border p-6">
        <h2 className="font-semibold text-foreground mb-4">Phase 0 — Setup Complete</h2>
        <div className="space-y-2 text-sm">
          {[
            'Next.js 14 with TypeScript strict mode',
            'Prisma schema pushed to Cloud SQL',
            'NextAuth.js with Google OAuth',
            'Dashboard layout with auth-protected routes',
            'PWA manifest configured',
            'shadcn/ui + MVR design tokens',
            'Webhook handlers for all integrations',
            'Audit logging on all write operations',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-mvr-success">
              <span>✓</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
