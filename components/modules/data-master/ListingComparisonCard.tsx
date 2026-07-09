'use client'

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeftRight } from 'lucide-react'
import { InfoHint } from './InfoHint'
import { PushableToGuestyBadge } from './PushableToGuestyBadge'

// ── Row types (built by the page) ────────────────────────────────────────────
export interface DmDriftRow {
  label: string
  field: string
  dmVal: string | number | null
  guestyVal: string | number | null
}
export interface UnitDriftRow {
  label: string
  field: string | null
  unitVal: number | string | null
  guestyVal: number | string | null
}
export type CompareKind = 'bool' | 'boolEnum' | 'text' | 'number'
export interface CfDriftRow {
  label: string
  unitField: string | null
  kind: CompareKind
  unitVal: string | number | boolean | null
  guestyVal: string | number | boolean | null
}

type Filter = 'all' | 'different' | 'inSync'

// ── helpers ──────────────────────────────────────────────────────────────────
const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()
const fmt = (v: string | number | boolean | null) =>
  v == null || v === '' ? '—' : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)

function simpleDiff(a: string | number | null, b: string | number | null): boolean {
  if (b === null || b === undefined || b === '') return false
  if (a === null || a === undefined || a === '') return true
  if (typeof a === 'number' || typeof b === 'number') return Number(a) !== Number(b)
  return norm(a) !== norm(b)
}
const toBool = (v: unknown) => (typeof v === 'boolean' ? v : norm(v) === 'true' || norm(v) === 'yes')
const enumBool = (v: unknown) => norm(v) !== 'no kitchen' && norm(v) !== 'no' && norm(v) !== 'false' && !!norm(v)
function cfDiff(r: CfDriftRow): boolean {
  if (r.guestyVal == null || r.guestyVal === '') return false
  if (r.kind === 'bool') return toBool(r.unitVal) !== toBool(r.guestyVal)
  if (r.kind === 'boolEnum') return toBool(r.unitVal) !== enumBool(r.guestyVal)
  if (r.kind === 'number') return Number(r.unitVal) !== Number(r.guestyVal)
  return norm(r.unitVal) !== norm(r.guestyVal)
}
function cfCopyValue(r: CfDriftRow): string | number | boolean {
  if (r.kind === 'bool') return toBool(r.guestyVal)
  if (r.kind === 'boolEnum') return enumBool(r.guestyVal)
  if (r.kind === 'number') return Number(r.guestyVal)
  return String(r.guestyVal)
}

// A normalized row for uniform rendering across the three sections.
interface DisplayRow {
  key: string
  label: string
  left: string
  right: string
  differs: boolean
  copyable: boolean
  onCopy: () => void
}

const usePill =
  'inline-flex items-center gap-1 rounded-full border border-[#E0DBD4] px-2 py-0.5 text-xs text-mvr-olive transition-colors hover:bg-mvr-neutral/50 disabled:opacity-50'

function SectionTable({
  title,
  info,
  leftHeader,
  rows,
  filter,
  editable,
  busy,
  headerRight,
}: {
  title: string
  info: string
  leftHeader: string
  rows: DisplayRow[]
  filter: Filter
  editable: boolean
  busy: boolean
  headerRight?: ReactNode
}) {
  const diff = rows.filter((r) => r.differs).length
  const visible = rows.filter((r) => (filter === 'all' ? true : filter === 'different' ? r.differs : !r.differs))

  return (
    <section>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-mvr-primary">{title}</h4>
          <InfoHint text={info} />
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              diff > 0 ? 'bg-mvr-warning-light text-mvr-warning' : 'bg-mvr-success-light text-mvr-success'
            }`}
          >
            <ArrowLeftRight className="size-3" />
            {diff > 0 ? `${diff} of ${rows.length} differ` : 'In sync'}
          </span>
        </div>
        {headerRight}
      </div>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-1.5 font-medium">Field</th>
            <th className="py-1.5 font-medium">{leftHeader}</th>
            <th className="py-1.5 font-medium">Guesty</th>
            <th className="py-1.5" />
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={4} className="py-3 text-center text-xs text-muted-foreground">Nothing to show in this view.</td>
            </tr>
          )}
          {visible.map((r) => (
            <tr key={r.key} className={`border-t border-[#E0DBD4]/60 ${r.differs ? 'bg-mvr-warning-light/40' : ''}`}>
              <td className="py-2 text-mvr-olive">{r.label}</td>
              <td className="max-w-[8rem] truncate py-2 font-medium text-mvr-olive">{r.left}</td>
              <td className={`max-w-[8rem] truncate py-2 ${r.differs ? 'text-mvr-warning' : 'text-muted-foreground'}`}>{r.right}</td>
              <td className="py-2 text-right">
                {editable && r.copyable && (
                  <button type="button" disabled={busy} onClick={r.onCopy} className={usePill}>use Guesty</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

const Divider = () => <div className="border-t border-[#E0DBD4]" />

export default function ListingComparisonCard({
  listingId,
  unitId,
  editable,
  dmRows,
  unitRows,
  cfRows,
}: {
  listingId: string
  unitId: string | null
  editable: boolean
  dmRows: DmDriftRow[]
  unitRows: UnitDriftRow[]
  cfRows: CfDriftRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')

  // Copyable diffs per source (used by the global "Use Guesty for all").
  const dmCopyable = dmRows.filter((r) => simpleDiff(r.dmVal, r.guestyVal) && r.guestyVal !== null && r.guestyVal !== '')
  const unitCopyable = unitRows.filter((r) => simpleDiff(r.unitVal, r.guestyVal) && r.field && typeof r.guestyVal === 'number')
  const cfCopyable = cfRows.filter((r) => cfDiff(r) && r.unitField)
  const totalCopyable = dmCopyable.length + unitCopyable.length + cfCopyable.length

  async function patch(url: string, body: Record<string, unknown>): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast.error(j?.error ?? 'Could not update')
        return false
      }
      return true
    } catch {
      toast.error('Network error')
      return false
    }
  }

  async function run(fn: () => Promise<boolean>, msg: string) {
    setBusy(true)
    const ok = await fn()
    if (ok) {
      toast.success(msg)
      router.refresh()
    }
    setBusy(false)
  }

  async function useGuestyForAll() {
    if (totalCopyable === 0) return
    setBusy(true)
    let ok = true
    if (dmCopyable.length) {
      ok = (await patch(`/api/v1/listings/${listingId}`, Object.fromEntries(dmCopyable.map((r) => [r.field, r.guestyVal])))) && ok
    }
    if (unitId && (unitCopyable.length || cfCopyable.length)) {
      const body: Record<string, unknown> = {
        ...Object.fromEntries(unitCopyable.map((r) => [r.field as string, r.guestyVal as number])),
        ...Object.fromEntries(cfCopyable.map((r) => [r.unitField as string, cfCopyValue(r)])),
      }
      ok = (await patch(`/api/v1/units/${unitId}`, body)) && ok
    }
    if (ok) {
      toast.success(`Updated ${totalCopyable} field${totalCopyable > 1 ? 's' : ''} from Guesty`)
      router.refresh()
    }
    setBusy(false)
  }

  // Build normalized display rows for each section.
  const dmDisplay: DisplayRow[] = dmRows.map((r) => ({
    key: r.label,
    label: r.label,
    left: fmt(r.dmVal),
    right: fmt(r.guestyVal),
    differs: simpleDiff(r.dmVal, r.guestyVal),
    copyable: simpleDiff(r.dmVal, r.guestyVal) && r.guestyVal !== null && r.guestyVal !== '',
    onCopy: () => run(() => patch(`/api/v1/listings/${listingId}`, { [r.field]: r.guestyVal }), 'Field updated from Guesty'),
  }))
  const unitDisplay: DisplayRow[] = unitRows.map((r) => ({
    key: r.label,
    label: r.label,
    left: fmt(r.unitVal),
    right: fmt(r.guestyVal),
    differs: simpleDiff(r.unitVal, r.guestyVal),
    copyable: !!(simpleDiff(r.unitVal, r.guestyVal) && r.field && typeof r.guestyVal === 'number'),
    onCopy: () =>
      unitId && run(() => patch(`/api/v1/units/${unitId}`, { [r.field as string]: r.guestyVal }), 'Unit updated from Guesty'),
  }))
  const cfDisplay: DisplayRow[] = cfRows.map((r) => ({
    key: r.label,
    label: r.label,
    left: fmt(r.unitVal),
    right: fmt(r.guestyVal),
    differs: cfDiff(r),
    copyable: !!(cfDiff(r) && r.unitField),
    onCopy: () =>
      unitId && run(() => patch(`/api/v1/units/${unitId}`, { [r.unitField as string]: cfCopyValue(r) }), 'Unit updated from Guesty'),
  }))

  const bulkButton =
    editable && totalCopyable > 0 ? (
      <button
        type="button"
        onClick={useGuestyForAll}
        disabled={busy}
        title="Copy every differing Guesty value across all sections"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-mvr-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-mvr-primary/90 disabled:opacity-50"
      >
        <ArrowLeftRight className="size-3" />
        Use Guesty for all ({totalCopyable})
      </button>
    ) : undefined

  return (
    <div className="space-y-5 rounded-xl border border-[#E0DBD4] border-l-4 border-l-mvr-primary bg-white p-5 shadow-card">
      {/* Global filter (centered) + Push tag (right) in one row */}
      <div className="relative flex items-center justify-center">
        <div className="inline-flex rounded-lg border border-[#E0DBD4] bg-mvr-neutral/30 p-0.5">
          {(
            [
              ['all', 'All'],
              ['different', 'Different'],
              ['inSync', 'In sync'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-md px-4 py-1 text-xs font-medium transition-colors ${
                filter === k ? 'bg-white text-mvr-primary shadow-sm' : 'text-muted-foreground hover:text-mvr-olive'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="absolute right-0">
          <PushableToGuestyBadge note="These fields can push to update the Guesty listing — coming soon." />
        </div>
      </div>

      <SectionTable
        title="General Info"
        info="Data Master is the source of truth. Copy a Guesty value only if you want to change Data Master."
        leftHeader="Data Master"
        rows={dmDisplay}
        filter={filter}
        editable={editable}
        busy={busy}
        headerRight={bulkButton}
      />

      {unitId && (
        <>
          <Divider />
          <SectionTable
            title="Unit Specs"
            info="The unit is the source of truth. Copy a Guesty value only if you want to change the unit."
            leftHeader="Unit"
            rows={unitDisplay}
            filter={filter}
            editable={editable}
            busy={busy}
          />
          <Divider />
          <SectionTable
            title="Custom Fields"
            info="The unit is the source of truth. Copy a Guesty value only if you want to change the unit."
            leftHeader="Unit"
            rows={cfDisplay}
            filter={filter}
            editable={editable}
            busy={busy}
          />
        </>
      )}
    </div>
  )
}
