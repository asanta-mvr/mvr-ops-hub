'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, ChevronRight, User as UserIcon, Mail, Shield } from 'lucide-react'

export interface UserRow {
  id: string
  email: string
  name: string | null
  image: string | null
  role: string
  isActive: boolean
  lastLoginAt: string | null
  permissionCount: number
}

interface Props {
  rows: UserRow[]
}

type StatusFilter = 'all' | 'active' | 'pending' | 'inactive'

function statusOf(u: UserRow): 'active' | 'pending' | 'inactive' {
  if (!u.isActive) return 'inactive'
  if (u.role === 'super_admin') return 'active'
  return u.permissionCount > 0 ? 'active' : 'pending'
}

function statusBadge(s: 'active' | 'pending' | 'inactive') {
  if (s === 'active') return 'bg-mvr-success-light text-mvr-success border-mvr-success/30'
  if (s === 'pending') return 'bg-mvr-warning-light text-mvr-warning border-mvr-warning/30'
  return 'bg-mvr-neutral text-muted-foreground border-[#E0DBD4]'
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60_000)
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} d ago`
}

function humanRole(r: string): string {
  return r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function UserListTable({ rows }: Props) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((u) => {
      const s = statusOf(u)
      if (status !== 'all' && status !== s) return false
      if (!q) return true
      return (
        u.email.toLowerCase().includes(q) ||
        (u.name ?? '').toLowerCase().includes(q)
      )
    })
  }, [rows, search, status])

  return (
    <div className="bg-white rounded-xl border border-[#E0DBD4] shadow-card overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-[#E0DBD4] bg-mvr-cream/60 flex flex-wrap items-center gap-3">
        <label className="relative inline-flex items-center flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 w-3.5 h-3.5 text-mvr-sand pointer-events-none" aria-hidden />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            aria-label="Search users"
            className="w-full text-xs border border-[#E0DBD4] rounded-md pl-7 pr-7 py-1.5 bg-white focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="Clear search"
              className="absolute right-1.5 p-0.5 rounded text-muted-foreground hover:text-mvr-primary hover:bg-mvr-neutral"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </label>

        <div className="inline-flex rounded-md border border-[#E0DBD4] bg-white overflow-hidden text-xs">
          {(['all', 'active', 'pending', 'inactive'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                status === s
                  ? 'bg-mvr-primary text-white font-medium'
                  : 'text-mvr-primary hover:bg-mvr-cream'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground ml-auto">
          {filtered.length} of {rows.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          No users match the current filter.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-mvr-cream border-b border-[#E0DBD4] text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="py-2.5 px-4 text-left">User</th>
                <th className="py-2.5 px-2 text-left">Status</th>
                <th className="py-2.5 px-2 text-left">Legacy role</th>
                <th className="py-2.5 px-2 text-left">Last login</th>
                <th className="py-2.5 px-2 text-right">Resources</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const s = statusOf(u)
                return (
                  <tr
                    key={u.id}
                    className="border-b border-[#E0DBD4] last:border-b-0 hover:bg-mvr-cream/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <Link href={`/settings/users/${u.id}`} className="flex items-center gap-3 group">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt=""
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full border border-[#E0DBD4]"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-mvr-sand-light border border-[#E0DBD4] flex items-center justify-center">
                            <UserIcon className="w-4 h-4 text-mvr-primary/60" aria-hidden />
                          </div>
                        )}
                        <div className="leading-tight min-w-0">
                          <div className="text-sm font-medium text-mvr-primary group-hover:underline truncate">
                            {u.name ?? <span className="text-muted-foreground italic">No name</span>}
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                            <Mail className="w-3 h-3" aria-hidden />
                            {u.email}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${statusBadge(s)}`}
                      >
                        {s}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Shield className="w-3 h-3" aria-hidden />
                        {humanRole(u.role)}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-[11px] text-mvr-olive">
                      {timeAgo(u.lastLoginAt)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span className="font-display text-mvr-primary">{u.permissionCount}</span>
                      {u.role === 'super_admin' && (
                        <span className="ml-1 text-[10px] text-muted-foreground uppercase tracking-widest">
                          full
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Link
                        href={`/settings/users/${u.id}`}
                        aria-label={`Edit ${u.email}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-mvr-primary hover:bg-mvr-neutral transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
