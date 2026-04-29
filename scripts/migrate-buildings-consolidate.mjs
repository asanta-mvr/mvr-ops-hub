/**
 * One-time migration:
 * 1. Merges `rules` blocks into `knowledgeBase` with section: 'rules' / 'kb'
 * 2. Copies property managers into `emergencyContacts`
 */

import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function parseBlocks(text, defaultSection) {
  if (!text) return []
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) {
      return parsed.map(b => ({
        id: b.id ?? genId(),
        title: b.title ?? '',
        description: b.description ?? '',
        section: b.section ?? defaultSection,
      }))
    }
  } catch {}
  return []
}

async function main() {
  const buildings = await db.building.findMany({
    select: {
      id: true, name: true, rules: true, knowledgeBase: true,
      propertyManagers: {
        select: { name: true, contactName: true, contactPhone: true, contactEmail: true, contactRole: true, isPrimary: true },
        orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
      },
    },
  })

  for (const b of buildings) {
    const rulesBlocks = parseBlocks(b.rules, 'rules')
    const kbBlocks    = parseBlocks(b.knowledgeBase, 'kb')
    const combined    = [...rulesBlocks, ...kbBlocks]

    const contacts = b.propertyManagers.map(m => ({
      name:      m.contactName || m.name,
      phone:     m.contactPhone  ?? '',
      email:     m.contactEmail  ?? '',
      role:      m.contactRole   ?? '',
      isPrimary: m.isPrimary,
    }))

    const updates = {}
    if (combined.length > 0 || b.rules) {
      updates.knowledgeBase = JSON.stringify(combined)
      updates.rules = null
    }
    if (contacts.length > 0) {
      updates.emergencyContacts = contacts
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  ${b.name}: nothing to migrate`)
      continue
    }

    await db.building.update({ where: { id: b.id }, data: updates })

    console.log(`  ${b.name}: merged ${rulesBlocks.length} rules + ${kbBlocks.length} kb blocks → knowledgeBase; ${contacts.length} contacts → emergencyContacts`)
  }

  console.log('\nDone.')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
