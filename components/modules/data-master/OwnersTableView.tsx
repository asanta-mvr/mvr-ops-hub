'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, Trash2, Search, Plus, User, Mail, Phone,
  Building2, ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerRow {
  id:           string
  uniqueId:     string
  nickname:     string
  type:         'individual' | 'company'
  status:       'active' | 'inactive' | 'churned'
  email:        string | null
  phone:        string | null
  nationality:  string | null
  language:     string
  unitCount:    number
}

interface Props {
  owners: OwnerRow[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-mvr-success-light text-mvr-success',
  inactive: 'bg-mvr-neutral text-muted-foreground',
  churned:  'bg-mvr-danger-light text-mvr-danger',
}

const TYPE_STYLES: Record<string, string> = {
  individual: 'bg-mvr-primary-light text-mvr-primary',
  company:    'bg-mvr-sand-light text-mvr-olive',
}

type SortField = 'nickname' | 'type' | 'status' | 'unitCount'
type SortDir   = 'asc' | 'desc'

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (field !== sortField) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-mvr-primary" />
    : <ChevronDown className="w-3 h-3 text-mvr-primary" />
}

// ── Main component ────────────────────────────────────────────────────────────

export function OwnersTableView({ owners }: Props) {
  const router  = useRouter()
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('nickname')
  const [sortDir,   setSortDir]   = useState<SortDir>('asc')
  const [deleting,  setDeleting]  = useState<string | null>(null)

  function toggleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let list = [...owners]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.nickname.toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q) ||
        (o.phone ?? '').toLowerCase().includes(q) ||
        o.uniqueId.toLowerCase().includes(q)
      )
    }
    if (statusFilter) {
      list = list.filter(o => o.status === statusFilter)
    }
    list.sort((a, b) => {
      let cmp = 0
      if (sortField === 'nickname')  cmp = a.nickname.localeCompare(b.nickname)
      if (sortField === 'type')      cmp = a.type.localeCompare(b.type)
      if (sortField === 'status')    cmp = a.status.localeCompare(b.status)
      if (sortField === 'unitCount') cmp = a.unitCount - b.unitCount
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [owners, search, statusFilter, sortField, sortDir])

  async function handleDelete(id: string, nickname: string) {
    if (!confirm(`Mark "${nickname}" as churned? This will soft-delete the owner.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/v1/owners/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.refresh()
      } else {
        alert('Failed to delete owner.')
      }
    } finally {
      setDeleting(null)
    }
  }

  const Th = ({
    field,
    children,
    className = '',
  }: {
    field?: SortField
    children: React.ReactNode
    className?: string
  }) => (
    <th
      onClick={field ? () => toggleSort(field) : undefined}
      className={`px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${field ? 'cursor-pointer select-none hover:text-mvr-primary' : ''} ${className}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {field && <SortIcon field={field} sortField={sortField} sortDir={sortDir} />}
      </div>
    </th>
  )

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, phone, ID…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 bg-white"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="churned">Churned</option>
          </select>
        </div>
        <Link href="/data-master/owners/new">
          <Button className="bg-mvr-primary hover:bg-mvr-primary/90 gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New Owner
          </Button>
        </Link>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} owner{filtered.length !== 1 ? 's' : ''}</span>
        {statusFilter && (
          <span>
            · filtered by <strong className="text-foreground">{statusFilter}</strong>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-mvr-cream">
              <tr>
                <Th field="nickname">
                  <User className="w-3.5 h-3.5 mr-1" />
                  Owner
                </Th>
                <Th field="type">Type</Th>
                <Th field="status">Status</Th>
                <Th>
                  <Mail className="w-3.5 h-3.5 mr-1" />
                  Email
                </Th>
                <Th>
                  <Phone className="w-3.5 h-3.5 mr-1" />
                  Phone
                </Th>
                <Th field="unitCount">
                  <Building2 className="w-3.5 h-3.5 mr-1" />
                  Units
                </Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E0DBD4]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No owners found.
                  </td>
                </tr>
              ) : (
                filtered.map(owner => (
                  <tr
                    key={owner.id}
                    className="hover:bg-mvr-neutral/30 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/data-master/owners/${owner.id}`}
                        className="font-medium text-mvr-primary hover:underline"
                      >
                        {owner.nickname}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {owner.uniqueId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[owner.type] ?? ''}`}>
                        {owner.type === 'individual' ? 'Individual' : 'Company'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[owner.status] ?? ''}`}>
                        {owner.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {owner.email ? (
                        <a href={`mailto:${owner.email}`} className="hover:text-mvr-primary transition-colors">
                          {owner.email}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {owner.phone ?? <span className="text-muted-foreground/50">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {owner.unitCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-mvr-primary">
                          {owner.unitCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/data-master/owners/${owner.id}/edit`}
                          className="p-1.5 text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(owner.id, owner.nickname)}
                          disabled={deleting === owner.id}
                          className="p-1.5 text-muted-foreground hover:text-mvr-danger hover:bg-mvr-danger-light rounded-lg transition-colors disabled:opacity-50"
                          title="Mark as churned"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
