// Seeds default NotificationRule rows used by the live n8n workflow rule lookup.
// Run: npm run db:seed:rules
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('🌱 Seeding notification rules...')

  // Ensure a system user exists so the FK on createdById resolves.
  // The dev login flow already upserts 'dev-user-001'; we reuse that id.
  const systemUser = await db.user.upsert({
    where: { id: 'dev-user-001' },
    update: {},
    create: {
      id: 'dev-user-001',
      email: 'dev@miamivacationrentals.com',
      name: 'System (Rules Seed)',
      role: 'super_admin',
    },
  })

  const fallbackChannel = process.env.SLACK_OPS_CHANNEL_ID ?? 'C098R8ZMZTL'

  const rules = [
    {
      name: 'Highest Risk Charge',
      description:
        'Stripe Radar flagged this charge as highest risk. CX should review the booking and consider cancelling before fulfillment.',
      criteria: { riskLevel: 'highest' },
      channel: fallbackChannel,
      priority: 'p1',
    },
    {
      name: 'Insufficient Funds Decline',
      description:
        'Card declined for insufficient funds. CX should reach out to the guest for an alternate payment method.',
      criteria: { reason: 'insufficient_funds' },
      channel: fallbackChannel,
      priority: 'high',
    },
  ]

  for (const r of rules) {
    const result = await db.notificationRule.upsert({
      where: { name: r.name },
      update: {
        description: r.description,
        criteria: r.criteria,
        channel: r.channel,
        priority: r.priority,
      },
      create: {
        ...r,
        enabled: true,
        createdById: systemUser.id,
      },
    })
    console.log(`  · ${result.name} (${result.priority}) → ${result.channel}`)
  }

  console.log('✅ Notification rules seeded')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
