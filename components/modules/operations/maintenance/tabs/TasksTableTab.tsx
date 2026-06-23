'use client'

// Tasks Table tab — paginated full task list. Pagination uses URL params
// (tasks_page / tasks_pageSize).
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { MaintenanceFilterBar } from '../MaintenanceFilterBar'
import { ChartCard } from '../ChartCard'
import { COLORS, STAGE_COLORS, STAGE_LABELS, formatCurrency, formatNumber } from '../format'
import type { MaintenanceFilterOptions, MaintenanceFilters, MaintenanceTaskRow, TasksListAggregate } from '@/lib/maintenance/types'

interface Props {
  filters:       MaintenanceFilters
  list:          TasksListAggregate
  filterOptions: MaintenanceFilterOptions
}

function titleCase(s: string): string {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function TasksTableTab({ filters, list, filterOptions }: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const totalPages = Math.max(1, Math.ceil(list.totalCount / list.pageSize))

  function goToPage(next: number) {
    const params = new URLSearchParams(searchParams.toString())
    if (next > 0) params.set('tasks_page', String(next))
    else          params.delete('tasks_page')
    const qs = params.toString()
    startTransition(() => router.push(qs.length > 0 ? `${pathname}?${qs}` : pathname))
  }

  return (
    <div className="space-y-4">
      <MaintenanceFilterBar
        prefix="tasks_"
        years={filters.years} statuses={filters.statuses} priorities={filters.priorities}
        subdepartments={filters.subdepartments} buildings={filters.buildings} billTos={filters.billTos} q={filters.q}
        yearOptions={filterOptions.years} statusOptions={filterOptions.statuses}
        priorityOptions={filterOptions.priorities} subdeptOptions={filterOptions.subdepartments}
        buildingOptions={filterOptions.buildings} billToOptions={filterOptions.billTos}
      />

      <ChartCard
        title={`All tasks (${formatNumber(list.totalCount)})`}
        subtitle="Maintenance-only scope. Click 'Open' to view the task in Breezeway."
        right={<span className="text-xs text-muted-foreground">Page {list.page + 1} of {totalPages}</span>}
      >
        {list.rows.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground"><ClipboardList className="w-6 h-6 mx-auto mb-2 opacity-40" /> No tasks match the current filters.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] text-muted-foreground border-b border-[#E0DBD4]">
                  <tr>
                    <th className="text-left py-2 px-2">Date</th>
                    <th className="text-left py-2 px-2">Task</th>
                    <th className="text-left py-2 px-2">Building / Unit</th>
                    <th className="text-left py-2 px-2">Subdept</th>
                    <th className="text-left py-2 px-2">Priority</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Tech</th>
                    <th className="text-right py-2 px-2">Cost</th>
                    <th className="text-left py-2 px-2">Bill-to</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {list.rows.map((t) => (
                    <TaskRow key={t.id} t={t} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-4 text-sm">
              <div className="text-muted-foreground text-xs">
                Showing {list.page * list.pageSize + 1}–{Math.min((list.page + 1) * list.pageSize, list.totalCount)} of {formatNumber(list.totalCount)}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(0, list.page - 1))}
                  disabled={isPending || list.page === 0}
                  className="px-3 py-1.5 text-xs rounded-md border border-[#E0DBD4] bg-white text-mvr-primary hover:bg-mvr-cream disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground px-2">{list.page + 1} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages - 1, list.page + 1))}
                  disabled={isPending || list.page >= totalPages - 1}
                  className="px-3 py-1.5 text-xs rounded-md border border-[#E0DBD4] bg-white text-mvr-primary hover:bg-mvr-cream disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </ChartCard>
    </div>
  )
}

function TaskRow({ t }: { t: MaintenanceTaskRow }) {
  const stageColor = STAGE_COLORS[t.statusStage] ?? COLORS.sand
  return (
    <tr className="border-b border-[#E0DBD4]/40 hover:bg-mvr-cream">
      <td className="py-2 px-2 text-xs text-muted-foreground whitespace-nowrap">
        {t.createdAt ? t.createdAt.slice(0, 10) : '—'}
      </td>
      <td className="py-2 px-2 max-w-[260px] truncate text-mvr-olive">{t.name}</td>
      <td className="py-2 px-2 text-xs">
        <div className="text-mvr-olive truncate max-w-[160px]">{t.building}</div>
        <div className="text-muted-foreground truncate max-w-[160px]">{t.unitName ?? ''}</div>
      </td>
      <td className="py-2 px-2 text-xs text-muted-foreground">{t.subdepartment ?? '—'}</td>
      <td className="py-2 px-2 text-xs">{titleCase(t.priority ?? '—')}</td>
      <td className="py-2 px-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded font-medium" style={{ background: `${stageColor}22`, color: stageColor }}>
          {STAGE_LABELS[t.statusStage] ?? t.statusStage}
        </span>
      </td>
      <td className="py-2 px-2 text-xs text-muted-foreground truncate max-w-[140px]">{t.finishedByName ?? t.createdByName ?? '—'}</td>
      <td className="py-2 px-2 text-right text-mvr-olive">{formatCurrency(t.totalCost)}</td>
      <td className="py-2 px-2 text-xs text-muted-foreground">{titleCase(t.billTo ?? '—')}</td>
      <td className="py-2 px-2">
        {t.reportUrl ? (
          <a href={t.reportUrl} target="_blank" rel="noopener noreferrer" className="text-mvr-primary hover:text-mvr-primary/80">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null}
      </td>
    </tr>
  )
}
