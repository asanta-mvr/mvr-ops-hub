'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Plus, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OtaSource, TicketStatus } from '@prisma/client'
import { CreateTicketModal } from './CreateTicketModal'

// ─── OTA logos ───────────────────────────────────────────────────────────────

const OTA_IMAGES: Partial<Record<OtaSource, string>> = {
  airbnb:  '/icons/ota-airbnb.jpg',
  booking: '/icons/ota-booking.png',
  expedia: '/icons/ota-expedia.png',
  vrbo:    '/icons/ota-vrbo.png',
  other:   '/icons/ota-other.png',
}

const OTA_TINT_BG: Record<OtaSource, string> = {
  airbnb:  '#FEF0F0',
  booking: '#EEF2F9',
  vrbo:    '#EEF6FB',
  expedia: '#FFFBEA',
  vacasa:  '#EEF2F5',
  other:   '#F3F4F6',
}

const OTA_TEXT_COLOR: Record<OtaSource, string> = {
  airbnb:  '#FF5A5F',
  booking: '#003580',
  vrbo:    '#1B7FCA',
  expedia: '#B8860B',
  vacasa:  '#1C3D5A',
  other:   '#6B7280',
}

const OTA_LABELS: Record<OtaSource, string> = {
  airbnb: 'Airbnb', booking: 'Booking', vrbo: 'VRBO',
  expedia: 'Expedia', vacasa: 'Vacasa', other: 'Other',
}

function OtaBadge({ source }: { source: OtaSource }) {
  const imgSrc = OTA_IMAGES[source]

  return (
    <div
      className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
      style={{ background: OTA_TINT_BG[source] }}
    >
      {imgSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imgSrc} alt={OTA_LABELS[source]} className="w-6 h-6 object-contain" />
      ) : (
        <span className="font-black text-sm" style={{ color: OTA_TEXT_COLOR[source] }}>
          {OTA_LABELS[source].charAt(0)}
        </span>
      )}
    </div>
  )
}

// ─── Status + Action helpers ──────────────────────────────────────────────────

const STATUS_STYLES: Record<TicketStatus, string> = {
  open:          'bg-transparent text-red-500 border-red-300',
  in_progress:   'bg-transparent text-blue-600 border-blue-300',
  pending_guest: 'bg-transparent text-amber-600 border-amber-300',
  pending_ota:   'bg-transparent text-amber-600 border-amber-300',
  resolved:      'bg-transparent text-green-600 border-green-300',
  closed:        'bg-transparent text-green-600 border-green-300',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open:          'Open',
  in_progress:   'In Progress',
  pending_guest: 'Pending Guest',
  pending_ota:   'Pending OTA',
  resolved:      'Resolved',
  closed:        'Closed',
}

function getAction(rate: number | null): { label: string; className: string } {
  if (rate === null) return { label: '—', className: 'text-gray-300' }
  if (rate >= 80)   return { label: 'Accept',  className: 'text-green-600 font-medium' }
  if (rate >= 60)   return { label: 'Mediate', className: 'text-amber-600 font-medium' }
  return              { label: 'Dispute', className: 'text-red-600 font-medium' }
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ─── Types ───────────────────────────────────────────────────────────────────

type Ticket = {
  id: string
  source: OtaSource
  status: TicketStatus
  subject: string
  guestName: string | null
  guestPhone: string | null
  confirmationCode: string | null
  fromEmail: string
  checkinDate: Date | null
  checkoutDate: Date | null
  successRate: number | null
  createdAt: Date
  assignedTo: { id: string; name: string | null } | null
  unit: { id: string; number: string } | null
  building: { id: string; name: string } | null
  _count: { comments: number }
}

type Agent    = { id: string; name: string | null }
type Building = { id: string; name: string }
type Unit     = { id: string; number: string; building: { name: string } | null }

interface TicketListProps {
  tickets:   Ticket[]
  agents:    Agent[]
  buildings: Building[]
  units:     Unit[]
  filters:   { status?: string; source?: string; assignedToId?: string; buildingId?: string }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TicketList({ tickets, agents, buildings, units, filters }: TicketListProps) {
  const router      = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [search,     setSearch]     = useState('')

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (filters.status)      params.set('status',      filters.status)
    if (filters.source)      params.set('source',      filters.source)
    if (filters.assignedToId) params.set('assignedToId', filters.assignedToId)
    if (filters.buildingId)  params.set('buildingId',  filters.buildingId)
    if (value) { params.set(key, value) } else { params.delete(key) }
    router.push(`/customer-success/tickets?${params.toString()}`)
  }

  const s = search.toLowerCase()
  const filtered = tickets.filter((t) =>
    !s ||
    t.subject.toLowerCase().includes(s) ||
    (t.guestName ?? '').toLowerCase().includes(s) ||
    (t.confirmationCode ?? '').toLowerCase().includes(s) ||
    t.fromEmail.toLowerCase().includes(s) ||
    (t.building?.name ?? '').toLowerCase().includes(s)
  )

  return (
    <>
      {showCreate && (
        <CreateTicketModal
          buildings={buildings}
          agents={agents}
          units={units}
          onClose={() => setShowCreate(false)}
        />
      )}

      <div className="space-y-4">
        {/* Search + Filters + New button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Global search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search guest, property, code…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-[#E0DBD4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-mvr-primary/20 focus:border-mvr-primary w-56"
            />
          </div>

          <select
            className="text-sm border border-[#E0DBD4] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
            value={filters.source ?? ''}
            onChange={(e) => updateFilter('source', e.target.value)}
          >
            <option value="">All OTAs</option>
            <option value="airbnb">Airbnb</option>
            <option value="booking">Booking</option>
            <option value="vrbo">VRBO</option>
            <option value="expedia">Expedia</option>
            <option value="vacasa">Vacasa</option>
            <option value="other">Other</option>
          </select>

          <select
            className="text-sm border border-[#E0DBD4] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
            value={filters.status ?? ''}
            onChange={(e) => updateFilter('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <select
            className="text-sm border border-[#E0DBD4] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
            value={filters.buildingId ?? ''}
            onChange={(e) => updateFilter('buildingId', e.target.value)}
          >
            <option value="">All Buildings</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          <select
            className="text-sm border border-[#E0DBD4] rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/20"
            value={filters.assignedToId ?? ''}
            onChange={(e) => updateFilter('assignedToId', e.target.value)}
          >
            <option value="">All Assignees</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name ?? a.id}</option>
            ))}
          </select>

          <button
            onClick={() => setShowCreate(true)}
            className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-mvr-primary text-white text-sm font-medium rounded-lg hover:bg-mvr-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </button>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm bg-white rounded-xl border">
            No tickets found.
          </div>
        ) : (
          <div className="rounded-xl border bg-white overflow-x-auto">
            <table className="w-full text-sm min-w-[1100px]">
              <thead className="bg-mvr-neutral border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">OTA</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Guest</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Check-in</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Check-out</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Success Rate</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-3 font-semibold text-mvr-primary text-xs uppercase tracking-wide">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE4]">
                {filtered.map((ticket) => {
                  const action = getAction(ticket.successRate)
                  return (
                    <tr key={ticket.id} className="hover:bg-mvr-cream/60 transition-colors">
                      {/* OTA */}
                      <td className="px-4 py-3">
                        <OtaBadge source={ticket.source} />
                      </td>

                      {/* Subject */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                        {ticket.confirmationCode && (
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{ticket.confirmationCode}</p>
                        )}
                      </td>

                      {/* Guest */}
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="font-semibold text-gray-900">{ticket.guestName ?? <span className="text-gray-300 font-normal">—</span>}</p>
                        {ticket.guestPhone && (
                          <p className="text-xs text-gray-400 mt-0.5">{ticket.guestPhone}</p>
                        )}
                      </td>

                      {/* Property */}
                      <td className="px-4 py-3 min-w-[160px]">
                        {ticket.building ? (
                          <>
                            <p className="font-semibold text-gray-900">{ticket.building.name}</p>
                            {ticket.unit && (
                              <p className="text-xs text-gray-400 mt-0.5">Unit {ticket.unit.number}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                          STATUS_STYLES[ticket.status]
                        )}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>

                      {/* Check-in */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(ticket.checkinDate)}
                      </td>

                      {/* Check-out */}
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {formatDate(ticket.checkoutDate)}
                      </td>

                      {/* Success Rate */}
                      <td className="px-4 py-3 min-w-[110px]">
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-gray-700">
                            {ticket.successRate !== null ? `${ticket.successRate}%` : '%'}
                          </p>
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: ticket.successRate !== null ? `${ticket.successRate}%` : '100%',
                                background: ticket.successRate === null
                                  ? '#8B2030'
                                  : ticket.successRate >= 80 ? '#2D6A4F'
                                  : ticket.successRate >= 60 ? '#B5541C'
                                  : '#8B2030',
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className={cn('px-4 py-3 text-sm', action.className)}>
                        {action.label}
                      </td>

                      {/* Detail — ••• */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/customer-success/tickets/${ticket.id}`}
                          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-mvr-neutral transition-colors text-gray-500 hover:text-mvr-primary"
                          title="View detail"
                        >
                          <MoreHorizontal className="w-4 h-4" />
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
    </>
  )
}
