// One-time migration: copy the deprecated policy_content rows into the new
// dispute_knowledge base. Idempotent — skips a row if an entry with the same
// title already exists. Self-contained (only @prisma/client).
// Run: npm run db:seed:knowledge
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

type Item = { title?: string; detail?: string }
type PolicyJson = { review?: Item[]; general_guests?: Item[]; general_hosts?: Item[] }

const OTA_LABEL: Record<string, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  vrbo: 'Vrbo',
  expedia: 'Expedia',
  vacasa: 'Vacasa',
  other: 'Other',
}

function bullets(items?: Item[]): string {
  return (items ?? [])
    .map((it) => `- ${it.title ?? ''}${it.detail ? `: ${it.detail}` : ''}`.trim())
    .filter((l) => l !== '-')
    .join('\n')
}

function flatten(section: string, json: PolicyJson): string {
  if (section === 'review') return bullets(json.review)
  const parts: string[] = []
  const g = bullets(json.general_guests)
  const h = bullets(json.general_hosts)
  if (g) parts.push(`Guests:\n${g}`)
  if (h) parts.push(`Hosts:\n${h}`)
  return parts.join('\n\n')
}

async function main() {
  console.log('🌱 Migrating policy_content → dispute_knowledge...')

  const systemUser = await db.user.upsert({
    where: { id: 'dev-user-001' },
    update: {},
    create: {
      id: 'dev-user-001',
      email: 'dev@miamivacationrentals.com',
      name: 'System (Knowledge Migration)',
      role: 'super_admin',
    },
  })

  const rows = await db.policyContent.findMany()
  if (rows.length === 0) {
    console.log('  (no policy_content rows to migrate)')
  }

  for (const row of rows) {
    const otaLabel = OTA_LABEL[row.ota] ?? row.ota
    const title = `${otaLabel} — ${row.section} policy`
    const existing = await db.disputeKnowledge.findFirst({ where: { title } })
    if (existing) {
      console.log(`  • ${title} (exists, skipped)`)
      continue
    }
    const body = flatten(row.section, (row.contentJson as PolicyJson) ?? {}) || '(no content)'
    await db.disputeKnowledge.create({
      data: {
        title,
        body,
        ota: row.ota,
        caseType: row.section === 'review' ? 'review' : null,
        category: row.section === 'review' ? 'Review policy' : 'General policy',
        sourceUrl: row.sourceUrl ?? null,
        enabled: true,
        createdById: systemUser.id,
      },
    })
    console.log(`  ✓ ${title}`)
  }
  console.log('✅ Knowledge migration complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
