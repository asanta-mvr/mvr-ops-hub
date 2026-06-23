// Shared formatters for the Maintenance Report module.
// Keep number / time formatting consistent across all tabs (KPIs, tooltips,
// table cells).

export function formatCurrency(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export function formatCurrencyDecimal(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n)
}

export function formatPercent(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—'
  return `${Math.round(n * 100)}%`
}

export function formatMinutes(min: number | null | undefined): string {
  if (min == null || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}

// Brand palette references for Recharts (cannot use tailwind class names
// inside Recharts components — they want literal color values).
export const COLORS = {
  primary:    '#1E2D40',
  sand:       '#CEC4B6',
  steel:      '#A2B4C0',
  steelLight: '#EBF0F4',
  olive:      '#2D2A1C',
  cream:      '#F7F4F0',
  success:    '#2D6A4F',
  warning:    '#B5541C',
  danger:     '#8B2030',
  // Reused for material/labor breakdown — distinct enough from primary.
  material:   '#6B5B95',   // muted purple
  labor:      '#3C8DAD',   // dusty teal
} as const

export const STAGE_COLORS: Record<string, string> = {
  finished:    COLORS.success,
  in_progress: COLORS.primary,
  new:         COLORS.warning,
  pending:     COLORS.warning,
  overdue:     COLORS.danger,
  cancelled:   COLORS.steel,
  unknown:     COLORS.sand,
}

export const STAGE_LABELS: Record<string, string> = {
  new:         'New',
  pending:     'Pending',
  in_progress: 'In progress',
  finished:    'Finished',
  cancelled:   'Cancelled',
  overdue:     'Overdue',
  unknown:     'Unknown',
}

export const PRIORITY_COLORS: Record<string, string> = {
  urgent:      COLORS.danger,
  high:        COLORS.warning,
  normal:      COLORS.primary,
  low:         COLORS.steel,
  watch:       COLORS.sand,
  unspecified: COLORS.sand,
}

export const BILL_TO_COLORS: Record<string, string> = {
  owner:       COLORS.warning,
  internal:    COLORS.primary,
  damage:      COLORS.danger,
  guest:       COLORS.material,
  review:      COLORS.steel,
  multiple:    COLORS.olive,
  insurance:   COLORS.labor,
  unspecified: COLORS.sand,
}

export const MATERIAL_LABOR_COLORS = {
  material: COLORS.material,
  labor:    COLORS.labor,
} as const

// Recharts Tooltip formatter helper — handles the loose ValueType signature
// (string | number | array | undefined) and returns a USD-formatted string.
export function tooltipCurrency(v: unknown): string {
  if (Array.isArray(v)) v = v[0]
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? formatCurrency(n) : '—'
}

export function tooltipNumber(v: unknown): string {
  if (Array.isArray(v)) v = v[0]
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? formatNumber(n) : '—'
}

// Palette for "rotation" series (e.g. bill-to slices, subdepartment colors).
// Picked to harmonize with the MVR cream background.
export const ROTATION_PALETTE = [
  COLORS.primary,
  COLORS.success,
  COLORS.warning,
  COLORS.steel,
  COLORS.material,
  COLORS.labor,
  COLORS.olive,
  COLORS.sand,
  COLORS.danger,
  '#7A8FA6',
  '#9C8B6E',
  '#5C7F8C',
] as const
