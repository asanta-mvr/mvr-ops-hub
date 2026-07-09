import type { LucideIcon } from 'lucide-react'

type DotTone = 'success' | 'danger' | 'warning'

interface Props {
  label: string
  /** A count (number) for portfolio/CX metrics, or a short status word for integrations. */
  value: string | number
  /** Optional caption under the label, e.g. "3 onboarding" or "last sync Jul 8". */
  sub?: string
  icon: LucideIcon
  /** Tailwind text color for the icon chip, e.g. 'text-mvr-primary'. */
  color?: string
  /** Renders a small status dot before the value; omit for plain metric cards. */
  dot?: DotTone
}

const DOT_CLASS: Record<DotTone, string> = {
  success: 'bg-mvr-success',
  danger: 'bg-mvr-danger',
  warning: 'bg-mvr-warning',
}

export function OverviewStatCard({ label, value, sub, icon: Icon, color = 'text-mvr-primary', dot }: Props) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg bg-gray-50 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-foreground flex items-center gap-2">
          {dot && <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[dot]}`} />}
          <span className="truncate">{value}</span>
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
