import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { TicketDetail } from '@/components/modules/customer-success/TicketDetail'

export const metadata: Metadata = { title: 'Ticket Detail' }

async function getTicket(id: string) {
  return db.supportTicket.findUnique({
    where: { id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true, image: true } },
      listing: { select: { id: true, name: true } },
      unit: { select: { id: true, number: true, buildingId: true } },
      building: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
}

async function getAgents() {
  return db.user.findMany({
    where: { role: { in: ['super_admin', 'operations_manager', 'cx_agent'] }, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}

export default async function TicketDetailPage({ params }: { params: { id: string } }) {
  const [ticket, agents] = await Promise.all([getTicket(params.id), getAgents()])

  if (!ticket) notFound()

  return <TicketDetail ticket={ticket} agents={agents} />
}
