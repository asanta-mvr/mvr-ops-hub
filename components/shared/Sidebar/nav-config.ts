// Single source of truth for the sidebar navigation tree. Each leaf declares
// the `resource` it represents so server-side guards can filter the tree
// down to what the current user is allowed to see.
import type { LucideIcon } from 'lucide-react'
import {
  Building2,
  Database,
  FileText,
  HeadphonesIcon,
  Home,
  LayoutDashboard,
  Mail,
  Plug,
  Settings,
  ShieldAlert,
  Ticket,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'
import type { Resource } from '@/lib/auth/resources'

export interface NavLeaf {
  label: string
  href: string
  icon: LucideIcon
  resource: Resource
}

export interface NavGroup {
  label: string
  href: string
  icon: LucideIcon
  children: NavLeaf[]
}

export type NavItem = NavLeaf | NavGroup

export function isGroup(item: NavItem): item is NavGroup {
  return 'children' in item
}

export const NAV_CONFIG: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, resource: 'dashboard' },
  {
    label: 'Data Master',
    href: '/data-master',
    icon: Database,
    children: [
      { label: 'Buildings', href: '/data-master/buildings', icon: Building2, resource: 'data_master.buildings' },
      { label: 'Units',     href: '/data-master/units',     icon: Home,      resource: 'data_master.units' },
      { label: 'Owners',    href: '/data-master/owners',    icon: Users,     resource: 'data_master.owners' },
      { label: 'Listings',  href: '/data-master/listings',  icon: FileText,  resource: 'data_master.listings' },
      { label: 'Contracts', href: '/data-master/contracts', icon: FileText,  resource: 'data_master.contracts' },
    ],
  },
  {
    label: 'Customer Success',
    href: '/customer-success/tickets',
    icon: HeadphonesIcon,
    children: [
      { label: 'OTA Tickets', href: '/customer-success/tickets',     icon: Ticket,      resource: 'customer_success.tickets' },
      { label: 'Chargebacks', href: '/customer-success/chargebacks', icon: ShieldAlert, resource: 'customer_success.chargebacks' },
    ],
  },
  { label: 'Operations',   href: '/operations',   icon: Wrench, resource: 'operations' },
  { label: 'Integrations', href: '/integrations', icon: Plug,   resource: 'integrations' },
  {
    label: 'Settings',
    href: '/settings/users',
    icon: Settings,
    children: [
      { label: 'Users', href: '/settings/users', icon: UserCog, resource: 'settings.users' },
      { label: 'Email', href: '/settings/email', icon: Mail,    resource: 'settings.email' },
    ],
  },
]
