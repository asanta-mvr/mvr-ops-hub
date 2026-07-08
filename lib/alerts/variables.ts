// Template variables for renewal-alert messages (Slack + email). Owner-level
// fields plus the document/file the alert is about, grouped by source for the
// UI picker. Pure + dependency-free so it's safe on both client and server.
//
// Extend later with Unit / Guesty groups without changing callers.

export interface VariableDef {
  token: string // e.g. "owner.firstName" — inserted as {{owner.firstName}}
  label: string
  example: string
}

export interface VariableGroup {
  key: string
  label: string
  variables: VariableDef[]
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    key: 'contact',
    label: 'Contact',
    variables: [
      { token: 'owner.phone', label: 'Phone', example: '+57 300 123 4567' },
      { token: 'owner.email', label: 'Email', example: 'owner@example.com' },
      { token: 'owner.otherEmail', label: 'Secondary email', example: 'alt@example.com' },
      { token: 'owner.address', label: 'Address', example: '123 Ocean Dr' },
      { token: 'owner.city', label: 'City', example: 'Miami' },
      { token: 'owner.state', label: 'State', example: 'Florida' },
      { token: 'owner.postalCode', label: 'Postal code', example: '33139' },
      { token: 'owner.country', label: 'Country', example: 'United States' },
    ],
  },
  {
    key: 'profile',
    label: 'Profile',
    variables: [
      { token: 'owner.firstName', label: 'First name', example: 'Carlos' },
      { token: 'owner.lastName', label: 'Last name', example: 'Restrepo' },
      { token: 'owner.fullName', label: 'Full name', example: 'Carlos Restrepo' },
      { token: 'owner.category', label: 'Category', example: 'VIP' },
      { token: 'owner.nationality', label: 'Nationality', example: 'Colombia' },
      { token: 'owner.language', label: 'Language', example: 'Spanish' },
      { token: 'owner.dateOfBirth', label: 'Date of birth', example: 'Mar 4, 1980' },
      { token: 'owner.status', label: 'Status', example: 'active' },
      { token: 'owner.personalityScore', label: 'Personality score', example: '65' },
      { token: 'owner.communicationScore', label: 'Communication score', example: '40' },
    ],
  },
  {
    key: 'identity',
    label: 'Identity',
    variables: [
      { token: 'owner.documentType', label: 'ID document type', example: 'Passport' },
      { token: 'owner.documentNumber', label: 'ID document number', example: 'AB123456' },
    ],
  },
  {
    key: 'document',
    label: 'Document',
    variables: [
      { token: 'doc.fileName', label: 'File name', example: 'COI - 1203.pdf' },
      { token: 'doc.folderName', label: 'Folder name', example: 'Insurance' },
      { token: 'doc.expirationDate', label: 'Expiration date', example: 'Aug 1, 2026' },
      { token: 'doc.daysUntilExpiry', label: 'Days until expiry', example: '30' },
    ],
  },
]

// Shapes the context builder needs — all optional so partial data is fine.
export interface OwnerVarSource {
  firstName?: string | null
  lastName?: string | null
  nickname?: string | null
  phone?: string | null
  email?: string | null
  otherEmail?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
  country?: string | null
  category?: string | null
  nationality?: string | null
  language?: string | null
  dateOfBirth?: Date | string | null
  status?: string | null
  personalityScore?: number | null
  communicationScore?: number | null
  documentType?: string | null
  documentNumber?: string | null
}

export interface DocVarSource {
  fileName?: string | null
  folderName?: string | null
  expirationDate?: Date | string | null
}

const ET = 'America/New_York'

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return ''
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { timeZone: ET, month: 'short', day: 'numeric', year: 'numeric' })
}

// UTC-safe whole-day difference (matches lib/owners/documentStatus daysUntil).
function daysUntil(value: Date | string | null | undefined, today: Date): number | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  const MS = 86_400_000
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const b = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((a - b) / MS)
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

// Build the flat {token: value} map used by renderTemplate.
export function buildVariableContext(
  { owner, doc }: { owner?: OwnerVarSource | null; doc?: DocVarSource | null },
  today: Date = new Date()
): Record<string, string> {
  const o = owner ?? {}
  const d = doc ?? {}
  const fullName = o.nickname || [o.firstName, o.lastName].filter(Boolean).join(' ')
  const days = daysUntil(d.expirationDate, today)
  return {
    'owner.firstName': str(o.firstName),
    'owner.lastName': str(o.lastName),
    'owner.fullName': str(fullName),
    'owner.phone': str(o.phone),
    'owner.email': str(o.email),
    'owner.otherEmail': str(o.otherEmail),
    'owner.address': str(o.address),
    'owner.city': str(o.city),
    'owner.state': str(o.state),
    'owner.postalCode': str(o.postalCode),
    'owner.country': str(o.country),
    'owner.category': str(o.category),
    'owner.nationality': str(o.nationality),
    'owner.language': str(o.language),
    'owner.dateOfBirth': fmtDate(o.dateOfBirth),
    'owner.status': str(o.status),
    'owner.personalityScore': str(o.personalityScore),
    'owner.communicationScore': str(o.communicationScore),
    'owner.documentType': str(o.documentType),
    'owner.documentNumber': str(o.documentNumber),
    'doc.fileName': str(d.fileName),
    'doc.folderName': str(d.folderName),
    'doc.expirationDate': fmtDate(d.expirationDate),
    'doc.daysUntilExpiry': days == null ? '' : String(days),
  }
}

// Replace {{ token }} occurrences; unknown tokens render as empty string.
export function renderTemplate(template: string, ctx: Record<string, string>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, token: string) => ctx[token] ?? '')
}
