'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MessageSquare, User, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OtaSource, TicketStatus } from '@prisma/client'
import { CreateTicketModal } from './CreateTicketModal'

const OTA_LABELS: Record<OtaSource, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  vrbo: 'VRBO',
  expedia: 'Expedia',
  vacasa: 'Vacasa',
  other: 'Other',
}

const OTA_COLORS: Record<OtaSource, string> = {
  airbnb: 'bg-rose-100 text-rose-700',
  booking: 'bg-blue-100 text-blue-700',
  vrbo: 'bg-teal-100 text-teal-700',
  expedia: 'bg-yellow-100 text-yellow-800',
  vacasa: 'bg-purple-100 text-purple-700',
  other: 'bg-gray-100 text-gray-600',
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  pending_guest: 'Pending Guest',
  pending_ota: 'Pending OTA',
  resolved: 'Resolved',
  closed: 'Closed',
}

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-blue-100 text-blue-700',
  pending_guest: 'bg-amber-100 text-amber-700',
  pending_ota: 'bg-orange-100 text-orange-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-500',
}

type Ticket = {
  id: string
  source: OtaSource
  status: TicketStatus
  subject: string
  guestName: string | null
  confirmationCode: string | null
  fromEmail: string
  createdAt: Date
  assignedTo: { id: string; name: string | null } | null
  unit: { id: string; number: string } | null
  building: { id: string; name: string } | null
  _count: { comments: number }
}

type Agent    = { id: string; name: string | null }
type Building = { id: string; name: string }

interface TicketListProps {
  tickets:   Ticket[]
  agents:    Agent[]
  buildings: Building[]
  filters:   { status?: string; source?: string; assignedToId?: string }
}

export function TicketList({ tickets, agents, buildings, filters }: TicketListProps) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.source) params.set('source', filters.source)
    if (filters.assignedToId) params.set('assignedToId', filters.assignedToId)
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/customer-success/tickets?${params.toString()}`)
  }

  return (
    <>
    {showCreate && (
      <CreateTicketModal
        buildings={buildings}
        agents={agents}
        onClose={() => setShowCreate(false)}
      />
    )}
    <div className="space-y-4">
      {/* Filters + New button */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/30"
          value={filters.source ?? ''}
          onChange={(e) => updateFilter('source', e.target.value)}
        >
          <option value="">All OTAs</option>
          {(Object.keys(OTA_LABELS) as OtaSource[]).map((s) => (
            <option key={s} value={s}>{OTA_LABELS[s]}</option>
          ))}
        </select>

        <select
          className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/30"
          value={filters.status ?? ''}
          onChange={(e) => updateFilter('status', e.target.value)}
        >
          <option value="">All Statuses</option>
          {(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        <select
          className="text-sm border rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-mvr-primary/30"
          value={filters.assignedToId ?? ''}
          onChange={(e) => updateFilter('assignedToId', e.target.value)}
        >
          <option value="">All Agents</option>
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
      {tickets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No tickets found for the selected filters.
        </div>
      ) : (
        <div className="rounded-lg border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">OTA</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Guest</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Property</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Assigned</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', OTA_COLORS[ticket.source])}>
                      {OTA_LABELS[ticket.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="truncate font-medium text-gray-900">{ticket.subject}</p>
                    {ticket.confirmationCode && (
                      <p className="text-xs text-gray-400 mt-0.5">{ticket.confirmationCode}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ticket.guestName ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ticket.building ? (
                      <span>{ticket.building.name}{ticket.unit ? ` · ${ticket.unit.number}` : ''}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', STATUS_COLORS[ticket.status])}>
                      {STATUS_LABELS[ticket.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {ticket.assignedTo ? (
                      <span className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-400" />
                        {ticket.assignedTo.name}
                      </span>
                    ) : (
                      <span className="text-gray-300">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {ticket._count.comments > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageSquare className="w-3 h-3" />
                          {ticket._count.comments}
                        </span>
                      )}
                      <Link
                        href={`/customer-success/tickets/${ticket.id}`}
                        className="text-xs text-mvr-primary hover:underline font-medium"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  )
}
