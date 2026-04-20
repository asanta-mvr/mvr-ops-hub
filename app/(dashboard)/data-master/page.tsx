import type { Metadata } from 'next'
import Link from 'next/link'
import { Building2, Home, Users, FileText, ScrollText } from 'lucide-react'

export const metadata: Metadata = { title: 'Data Master' }

const modules = [
  {
    label: 'Buildings',
    description: 'Manage building profiles, amenities, and property managers',
    href: '/data-master/buildings',
    icon: Building2,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    label: 'Units',
    description: 'Unit details, bedroom configuration, and photos',
    href: '/data-master/units',
    icon: Home,
    color: 'bg-green-50 text-green-600',
  },
  {
    label: 'Owners',
    description: 'Owner profiles, contacts, and relationship tracking',
    href: '/data-master/owners',
    icon: Users,
    color: 'bg-orange-50 text-orange-600',
  },
  {
    label: 'Listings',
    description: 'OTA listings linked to units across all platforms',
    href: '/data-master/listings',
    icon: FileText,
    color: 'bg-purple-50 text-purple-600',
  },
  {
    label: 'Contracts',
    description: 'Owner contracts, documents, and utilities',
    href: '/data-master/contracts',
    icon: ScrollText,
    color: 'bg-red-50 text-red-600',
  },
]

export default function DataMasterPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">Data Master</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Single source of truth for all property, owner, and listing data
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(({ label, description, href, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl border p-5 flex items-start gap-4 hover:shadow-md transition-shadow group"
          >
            <div className={`p-2.5 rounded-lg ${color} shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground group-hover:text-mvr-primary transition-colors">
                {label}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
