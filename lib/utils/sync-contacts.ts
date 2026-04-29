import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

/** Reads current property managers for a building and writes them to emergencyContacts. */
export async function syncEmergencyContacts(buildingId: string): Promise<void> {
  const managers = await db.propertyManager.findMany({
    where:   { buildingId },
    orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    select:  { name: true, contactName: true, contactPhone: true, contactEmail: true, contactRole: true, isPrimary: true },
  })

  const contacts = managers.map((m) => ({
    name:      m.contactName || m.name,
    phone:     m.contactPhone  ?? '',
    email:     m.contactEmail  ?? '',
    role:      m.contactRole   ?? '',
    isPrimary: m.isPrimary,
  }))

  await db.building.update({
    where: { id: buildingId },
    data:  { emergencyContacts: JSON.parse(JSON.stringify(contacts)) as Prisma.InputJsonValue },
  })
}
