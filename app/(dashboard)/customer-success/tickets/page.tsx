import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { TicketList } from '@/components/modules/customer-success/TicketList'
import type { OtaSource, TicketStatus } from '@prisma/client'

export const metadata: Metadata = { title: 'OTA Tickets' }

interface PageProps {
  searchParams: { status?: string; source?: string; assignedToId?: string; buildingId?: string }
}

async function getTickets(filters: PageProps['searchParams']) {
  return db.supportTicket.findMany({
    where: {
      ...(filters.status     ? { status:      filters.status as TicketStatus } : {}),
      ...(filters.source     ? { source:      filters.source as OtaSource }   : {}),
      ...(filters.assignedToId ? { assignedToId: filters.assignedToId }       : {}),
      ...(filters.buildingId ? { buildingId:  filters.buildingId }            : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      unit:       { select: { id: true, number: true } },
      building:   { select: { id: true, name: true } },
      _count:     { select: { comments: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

async function getAgents() {
  return db.user.findMany({
    where: { role: { in: ['super_admin', 'operations_manager', 'cx_agent'] }, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

async function getBuildings() {
  return db.building.findMany({
    where: { status: { not: 'inactive' } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export default async function TicketsPage({ searchParams }: PageProps) {
  const [tickets, agents, buildings] = await Promise.all([
    getTickets(searchParams),
    getAgents(),
    getBuildings(),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-mvr-primary">OTA Tickets</h1>
        <p className="text-muted-foreground text-sm mt-1">{tickets.length} tickets</p>
      </div>

      <TicketList tickets={tickets} agents={agents} buildings={buildings} filters={searchParams} />
    </div>
  )
}
