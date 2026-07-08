// Seeds the baseline document-type catalog (Contract, W-9, COI) and a default
// alert rule for each. Admins can add more types / edit rules later from the
// settings UI. Idempotent — safe to re-run. Run: npm run db:seed:documents
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

// scope: where the doc attaches (owner = personal, legal_owner = LLC, unit = property).
// hasExpiry: carries a renewal date. namingTemplate: how the Drive file is named.
const DOC_TYPES = [
  { key: 'contract', label: 'Management Contract',            scope: 'unit'        as const, hasExpiry: false, required: true,  sortOrder: 1, namingTemplate: 'Contract - {unit} - {issueDate}' },
  { key: 'coi',      label: 'Certificate of Insurance (COI)', scope: 'unit'        as const, hasExpiry: true,  required: true,  sortOrder: 2, namingTemplate: 'COI - {unit} - {issueDate}' },
  { key: 'hoa',      label: 'HOA Document',                   scope: 'unit'        as const, hasExpiry: false, required: false, sortOrder: 3, namingTemplate: 'HOA - {unit} - {issueDate}' },
  { key: 'w9',       label: 'W-9 (Tax Form)',                 scope: 'legal_owner' as const, hasExpiry: false, required: true,  sortOrder: 4, namingTemplate: 'W-9 - {legalOwner}' },
  { key: 'owner_id', label: 'Owner ID / Passport',            scope: 'owner'       as const, hasExpiry: true,  required: false, sortOrder: 5, namingTemplate: 'ID - {owner}' },
]

async function main() {
  console.log('🌱 Seeding document types + default alert rules...')

  const internalTarget = process.env.SLACK_OPS_CHANNEL_ID ?? null

  for (const t of DOC_TYPES) {
    const type = await db.documentType.upsert({
      where: { key: t.key },
      update: { label: t.label, scope: t.scope, hasExpiry: t.hasExpiry, required: t.required, sortOrder: t.sortOrder, namingTemplate: t.namingTemplate },
      create: { ...t, active: true },
    })

    // Default global rule: internal Slack reminders at 60/30/7 days out; owner
    // email reminders off by default (opt-in per type/owner). Only COI has an
    // expiry so its rule is the one that actually fires renewal reminders.
    await db.documentAlertRule.upsert({
      where: { typeKey: type.key },
      update: {},
      create: {
        typeKey: type.key,
        enabled: true,
        leadTimeDays: [60, 30, 7],
        notifyInternal: true,
        internalChannel: 'slack',
        internalTarget,
        notifyOwner: false,
        ownerLeadTimeDays: [30, 7],
      },
    })
    console.log(`  · ${type.label} [${type.scope}${type.hasExpiry ? ', expires' : ''}]`)
  }

  console.log('✅ Document types + alert rules seeded')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
