'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Pencil, Trash2, Search, Plus, Building2, X,
  ChevronLeft, ChevronRight, User, Mail, Phone,
  MapPin, Globe, Link2, FileText, Star, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OwnerUnit {
  id:           string
  number:       string
  buildingName: string
  status:       string
  score:        string | null
}

export interface OwnerFull {
  id:             string
  uniqueId:       string
  nickname:       string
  type:           'individual' | 'company'
  status:         'active' | 'inactive' | 'churned'
  email:          string | null
  otherEmail:     string | null
  phone:          string | null
  address:        string | null
  photoUrl:       string | null
  linkedin:       string | null
  age:            number | null
  nationality:    string | null
  language:       string
  siteUser:       string | null
  category:       string | null
  personality:    string | null
  documentType:   string | null
  documentNumber: string | null
  notes:          string | null
  unitCount:      number
  units:          OwnerUnit[]
}

interface Props {
  owners: OwnerFull[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

const STATUS_STYLES: Record<string, string> = {
  active:   'bg-mvr-success-light text-mvr-success',
  inactive: 'bg-mvr-neutral text-muted-foreground',
  churned:  'bg-mvr-danger-light text-mvr-danger',
}

const UNIT_STATUS_STYLES: Record<string, string> = {
  active:     'bg-mvr-success-light text-mvr-success',
  onboarding: 'bg-mvr-warning-light text-mvr-warning',
  renovation: 'bg-mvr-steel-light text-muted-foreground',
  inactive:   'bg-mvr-neutral text-muted-foreground',
  off_board:  'bg-mvr-danger-light text-mvr-danger',
}

// ── Owner Detail Panel ─────────────────────────────────────────────────────────

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

interface PanelProps {
  owner:   OwnerFull
  index:   number
  total:   number
  onClose: () => void
  onPrev:  () => void
  onNext:  () => void
  onDelete:(id: string, name: string) => void
}

function OwnerDetailPanel({ owner, index, total, onClose, onPrev, onNext, onDelete }: PanelProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border shadow-panel overflow-hidden">

      {/* ── Hero ── */}
      <div className="relative shrink-0 bg-mvr-primary px-6 pt-5 pb-6">
        {/* Close button — top right */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Centered avatar + name */}
        <div className="flex flex-col items-center text-center gap-3 pt-2">
          {owner.photoUrl ? (
            <img
              src={owner.photoUrl}
              alt={owner.nickname}
              className="w-24 h-24 rounded-full object-cover border-[3px] border-white/30 shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-white/15 border-[3px] border-white/25 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl tracking-wider">
                {initials(owner.nickname)}
              </span>
            </div>
          )}

          <div>
            <h3 className="text-white font-bold text-lg leading-tight">
              {owner.nickname}
            </h3>
            <p className="text-white/50 text-xs font-mono mt-1">{owner.uniqueId}</p>
          </div>

          {/* Badges row */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[owner.status] ?? ''}`}>
              {owner.status}
            </span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white capitalize">
              {owner.type}
            </span>
            {owner.unitCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white">
                <Building2 className="w-3 h-3" />
                {owner.unitCount} unit{owner.unitCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Nav bar ── */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b bg-mvr-cream">
        <div className="flex items-center gap-0.5">
          <button
            onClick={onPrev}
            disabled={index <= 0}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground px-1">
            {index + 1} / {total}
          </span>
          <button
            onClick={onNext}
            disabled={index >= total - 1}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light transition-colors disabled:opacity-30 disabled:cursor-default"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`/data-master/owners/${owner.id}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-mvr-primary hover:bg-mvr-primary-light rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Full profile
          </Link>
          <Link
            href={`/data-master/owners/${owner.id}/edit`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium bg-mvr-primary text-white rounded-lg hover:bg-mvr-primary/90 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </Link>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Contact */}
        {(owner.phone || owner.email || owner.otherEmail || owner.address) && (
          <section className="px-4 py-4 border-b border-[#E0DBD4]">
            <h4 className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mb-3">Contact</h4>
            <div className="space-y-2.5">
              {owner.phone && (
                <InfoRow icon={Phone} label="Phone">
                  <a href={`tel:${owner.phone}`} className="text-sm hover:text-mvr-primary transition-colors">{owner.phone}</a>
                </InfoRow>
              )}
              {owner.email && (
                <InfoRow icon={Mail} label="Email">
                  <a href={`mailto:${owner.email}`} className="text-sm hover:text-mvr-primary transition-colors truncate block">{owner.email}</a>
                </InfoRow>
              )}
              {owner.otherEmail && (
                <InfoRow icon={Mail} label="Alt email">
                  <a href={`mailto:${owner.otherEmail}`} className="text-sm hover:text-mvr-primary transition-colors truncate block">{owner.otherEmail}</a>
                </InfoRow>
              )}
              {owner.address && (
                <InfoRow icon={MapPin} label="Address">
                  <p className="text-sm text-foreground whitespace-pre-line">{owner.address}</p>
                </InfoRow>
              )}
            </div>
          </section>
        )}

        {/* Profile */}
        {(owner.nationality || owner.age || owner.language || owner.category || owner.personality || owner.linkedin || owner.siteUser) && (
          <section className="px-4 py-4 border-b border-[#E0DBD4]">
            <h4 className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mb-3">Profile</h4>
            <div className="space-y-2.5">
              {owner.nationality && (
                <InfoRow icon={Globe} label="Nationality">
                  <p className="text-sm">{owner.nationality}</p>
                </InfoRow>
              )}
              {owner.age && (
                <InfoRow icon={User} label="Age">
                  <p className="text-sm">{owner.age}</p>
                </InfoRow>
              )}
              {owner.language && (
                <InfoRow icon={Globe} label="Language">
                  <p className="text-sm">{owner.language.toUpperCase()}</p>
                </InfoRow>
              )}
              {owner.category && (
                <InfoRow icon={User} label="Category">
                  <p className="text-sm">{owner.category}</p>
                </InfoRow>
              )}
              {owner.linkedin && (
                <InfoRow icon={Link2} label="LinkedIn">
                  <a href={owner.linkedin} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-mvr-primary hover:underline truncate block">
                    LinkedIn profile
                  </a>
                </InfoRow>
              )}
              {owner.siteUser && (
                <InfoRow icon={User} label="Portal user">
                  <p className="text-sm font-mono">{owner.siteUser}</p>
                </InfoRow>
              )}
              {owner.personality && (
                <InfoRow icon={User} label="Style">
                  <p className="text-sm text-foreground">{owner.personality}</p>
                </InfoRow>
              )}
            </div>
          </section>
        )}

        {/* Documents */}
        {(owner.documentType || owner.documentNumber) && (
          <section className="px-4 py-4 border-b border-[#E0DBD4]">
            <h4 className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mb-3">Documents</h4>
            <div className="space-y-2.5">
              {owner.documentType && (
                <InfoRow icon={FileText} label="Type">
                  <p className="text-sm">{owner.documentType}</p>
                </InfoRow>
              )}
              {owner.documentNumber && (
                <InfoRow icon={FileText} label="Number">
                  <p className="text-sm font-mono">{owner.documentNumber}</p>
                </InfoRow>
              )}
            </div>
          </section>
        )}

        {/* Notes */}
        {owner.notes && (
          <section className="px-4 py-4 border-b border-[#E0DBD4]">
            <h4 className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mb-3">Notes</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{owner.notes}</p>
          </section>
        )}

        {/* Associated units */}
        {owner.units.length > 0 && (
          <section className="px-4 py-4">
            <h4 className="text-xs font-semibold text-mvr-primary uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Units ({owner.units.length})
            </h4>
            <div className="space-y-1.5">
              {owner.units.map(u => (
                <Link
                  key={u.id}
                  href={`/data-master/units/${u.id}`}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-mvr-neutral/50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-mvr-primary group-hover:underline">Unit {u.number}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.buildingName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.score && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                        <Star className="w-3 h-3" />{u.score}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${UNIT_STATUS_STYLES[u.status] ?? 'bg-mvr-neutral text-muted-foreground'}`}>
                      {u.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!owner.phone && !owner.email && !owner.nationality && !owner.notes && owner.units.length === 0 && (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground italic">
            No additional details recorded for this owner.
          </div>
        )}

        {/* Delete */}
        <div className="px-4 py-4 border-t border-[#E0DBD4]">
          <button
            onClick={() => onDelete(owner.id, owner.nickname)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-mvr-danger hover:bg-mvr-danger-light rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Mark as churned
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon: Icon, label, children }: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 p-1 bg-mvr-primary-light rounded-md shrink-0">
        <Icon className="w-3 h-3 text-mvr-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {children}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function OwnersTableView({ owners }: Props) {
  const router = useRouter()
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<string>('')
  const [activeLetter,  setActiveLetter]  = useState<string>('All')
  const [selectedId,    setSelectedId]    = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)

  // Letters that have at least one owner
  const occupiedLetters = useMemo(() => {
    const set = new Set<string>()
    owners.forEach(o => {
      const first = o.nickname.trim()[0]?.toUpperCase()
      if (first) set.add(first)
    })
    return set
  }, [owners])

  // Filtered, sorted flat list + grouped-by-letter list
  const { sortedList, grouped, total } = useMemo(() => {
    let list = [...owners]

    if (statusFilter) {
      list = list.filter(o => o.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(o =>
        o.nickname.toLowerCase().includes(q) ||
        (o.email ?? '').toLowerCase().includes(q) ||
        o.uniqueId.toLowerCase().includes(q)
      )
    } else if (activeLetter !== 'All') {
      list = list.filter(o =>
        o.nickname.trim()[0]?.toUpperCase() === activeLetter
      )
    }

    list.sort((a, b) => a.nickname.localeCompare(b.nickname))

    const map = new Map<string, OwnerFull[]>()
    list.forEach(o => {
      const key = o.nickname.trim()[0]?.toUpperCase() ?? '#'
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(o)
    })

    const grouped = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
    return { sortedList: list, grouped, total: list.length }
  }, [owners, search, statusFilter, activeLetter])

  const selectedOwner = sortedList.find(o => o.id === selectedId) ?? null
  const selectedIndex = sortedList.findIndex(o => o.id === selectedId)

  function handleSelect(id: string) {
    setSelectedId(prev => prev === id ? null : id)
  }

  function handleLetterClick(letter: string) {
    setActiveLetter(letter)
    setSearch('')
  }

  async function handleDelete(id: string, nickname: string) {
    if (!confirm(`Mark "${nickname}" as churned? This will soft-delete the owner.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/v1/owners/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (selectedId === id) setSelectedId(null)
        router.refresh()
      } else {
        alert('Failed to delete owner.')
      }
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value) setActiveLetter('All') }}
              placeholder="Search by name, email, ID…"
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-mvr-primary/30 focus:border-mvr-primary bg-white shrink-0 ${statusFilter ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
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

      {/* Directory */}
      <div className="flex gap-3 items-start">

        {/* ── Letter nav (sticky) ── */}
        <div className="sticky top-4 self-start w-[72px] shrink-0 bg-white rounded-xl border shadow-card flex flex-col py-2 max-h-[calc(100vh-180px)] overflow-y-auto">
          <button
            onClick={() => handleLetterClick('All')}
            className={`mx-2 my-0.5 py-1.5 text-sm font-medium rounded-full transition-colors ${
              activeLetter === 'All' && !search
                ? 'bg-mvr-neutral text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-mvr-neutral/50'
            }`}
          >
            All
          </button>

          <div className="w-full h-px bg-[#E0DBD4] my-1.5" />

          {LETTERS.map(letter => {
            const occupied = occupiedLetters.has(letter)
            const isActive = activeLetter === letter && !search
            return (
              <button
                key={letter}
                onClick={() => occupied && handleLetterClick(letter)}
                className={`mx-2 my-0.5 py-1 text-sm rounded-full transition-colors ${
                  isActive
                    ? 'bg-mvr-neutral font-semibold text-foreground'
                    : occupied
                    ? 'text-muted-foreground hover:text-foreground hover:bg-mvr-neutral/50'
                    : 'text-muted-foreground/30 cursor-default'
                }`}
              >
                {letter}
              </button>
            )
          })}
        </div>

        {/* ── Owner table ── */}
        <div className="flex-1 min-w-0 bg-white rounded-xl border shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E0DBD4] bg-mvr-cream">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                  <Building2 className="w-3.5 h-3.5 inline mr-1" />Units
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Phone</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-muted-foreground italic">
                    No owners found.
                  </td>
                </tr>
              ) : (
                grouped.map(([letter, rows]) => (
                  <React.Fragment key={letter}>
                    <tr>
                      <td colSpan={6} className="px-5 py-1.5 text-xs font-bold text-muted-foreground bg-mvr-cream border-y border-[#E0DBD4] tracking-widest">
                        {letter}
                      </td>
                    </tr>
                    {rows.map(owner => (
                      <tr
                        key={owner.id}
                        onClick={() => handleSelect(owner.id)}
                        className={`border-b border-[#E0DBD4] last:border-0 cursor-pointer transition-colors ${
                          selectedId === owner.id
                            ? 'bg-mvr-primary-light'
                            : 'hover:bg-mvr-neutral/30'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <p className={`font-medium ${selectedId === owner.id ? 'text-mvr-primary' : 'text-foreground'}`}>
                            {owner.nickname}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">{owner.uniqueId}</p>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[owner.status] ?? ''}`}>
                            {owner.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {owner.unitCount > 0
                            ? <span className="text-sm font-medium text-mvr-primary">{owner.unitCount}</span>
                            : <span className="text-muted-foreground/40">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden lg:table-cell">
                          {owner.email
                            ? <span className="truncate block max-w-[180px]">{owner.email}</span>
                            : <span className="text-muted-foreground/40">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-sm hidden lg:table-cell">
                          {owner.phone ?? <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className={`w-4 h-4 transition-transform ${selectedId === owner.id ? 'text-mvr-primary rotate-90' : 'text-muted-foreground/40'}`} />
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>

          <div className="px-5 py-3 border-t border-[#E0DBD4] bg-mvr-cream">
            <span className="text-xs text-muted-foreground">
              {total} owner{total !== 1 ? 's' : ''}
              {activeLetter !== 'All' && !search ? ` under "${activeLetter}"` : ''}
              {search ? ` matching "${search}"` : ''}
            </span>
          </div>
        </div>

        {/* ── Detail panel (sticky) ── */}
        {selectedOwner && (
          <div
            className="w-[440px] shrink-0 sticky top-4 self-start"
            style={{ maxHeight: 'calc(100vh - 5rem)' }}
          >
            <OwnerDetailPanel
              owner={selectedOwner}
              index={selectedIndex}
              total={sortedList.length}
              onClose={() => setSelectedId(null)}
              onPrev={() => {
                if (selectedIndex > 0) setSelectedId(sortedList[selectedIndex - 1].id)
              }}
              onNext={() => {
                if (selectedIndex < sortedList.length - 1) setSelectedId(sortedList[selectedIndex + 1].id)
              }}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>
    </div>
  )
}
