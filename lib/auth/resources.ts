// Catalog of all RBAC resources. A "resource" is a sub-page or capability
// (finer-grained than the legacy `UserRole` enum). Each user holds zero or
// more `UserPermission` rows pairing a resource with a level. super_admin
// bypasses the matrix and has implicit `edit` on everything.

// Levels in increasing strictness: view < edit < full. `full` ("Full") grants
// everything edit can do PLUS permanent erase, and implies edit + view. It
// applies to every resource and can only be granted by a super_admin.
export type Level = 'view' | 'edit' | 'full'

export const RESOURCES = [
  { key: 'dashboard',                          label: 'Dashboard',           group: 'General' },
  { key: 'data_master.buildings',              label: 'Buildings',           group: 'Data Master' },
  { key: 'data_master.units',                  label: 'Units',               group: 'Data Master' },
  { key: 'data_master.owners',                 label: 'Owners',              group: 'Data Master' },
  { key: 'data_master.listings',               label: 'Listings',            group: 'Data Master' },
  { key: 'data_master.contracts',              label: 'Contracts',           group: 'Data Master' },
  { key: 'customer_success.tickets',           label: 'OTA Tickets',         group: 'Customer Success' },
  { key: 'customer_success.chargebacks',       label: 'Chargebacks',         group: 'Customer Success' },
  { key: 'customer_success.chargebacks_rules', label: 'Chargeback Alert Rules', group: 'Customer Success' },
  { key: 'customer_success.reviews',           label: 'Reviews',             group: 'Customer Success' },
  { key: 'customer_success.dispute_tool',      label: 'Dispute Tool',        group: 'Customer Success' },
  { key: 'operations',                         label: 'Operations',          group: 'Operations' },
  { key: 'operations.maintenance',             label: 'Maintenance Report',  group: 'Operations' },
  { key: 'integrations',                       label: 'Integrations',        group: 'Operations' },
  { key: 'settings.users',                     label: 'User Management',     group: 'Settings' },
  { key: 'settings.email',                     label: 'Email Setup',         group: 'Settings' },
] as const

export type Resource = (typeof RESOURCES)[number]['key']
export type ResourceGroup = (typeof RESOURCES)[number]['group']

const RESOURCE_KEYS = new Set<string>(RESOURCES.map((r) => r.key))

export function isResource(value: string): value is Resource {
  return RESOURCE_KEYS.has(value)
}

export function resourceMeta(key: Resource): (typeof RESOURCES)[number] {
  // Safe non-null assertion: `key` is constrained to the union.
  return RESOURCES.find((r) => r.key === key)!
}

// Convenience: levels in increasing strictness order.
export const LEVELS: readonly Level[] = ['view', 'edit', 'full'] as const

const LEVEL_RANK: Record<Level, number> = { view: 1, edit: 2, full: 3 }

export function levelSatisfies(actual: Level | undefined, required: Level): boolean {
  if (!actual) return false
  return LEVEL_RANK[actual] >= LEVEL_RANK[required]
}
