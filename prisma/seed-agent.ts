// Seeds 2 starter Dispute Tool skills (Review-removal + OTA-dispute playbooks).
// The agent config row is created lazily by getAgentConfig(); only skills need a seed.
// Idempotent: skips a skill if one with the same name already exists.
// Run: npm run db:seed:agent
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const STARTERS: Array<{
  name: string
  caseType: 'review' | 'disputa' | null
  ota: null
  instructions: string
}> = [
  {
    name: 'Review removal playbook',
    caseType: 'review',
    ota: null,
    instructions: [
      'Identifica primero la causal de remoción aplicable de la OTA (irrelevante, extorsión, PII, etc.).',
      'Cita textualmente la parte de la reseña o conversación que activa la causal.',
      'Si ninguna causal aplica con evidencia clara, recomienda NO enviar la apelación.',
      'El mensaje a soporte debe ser corto, formal y referenciar la política específica.',
    ].join('\n'),
  },
  {
    name: 'OTA dispute playbook',
    caseType: 'disputa',
    ota: null,
    instructions: [
      'Confirma el monto en disputa y arma una cronología clara de los hechos.',
      'Lista la evidencia disponible (mensajes, fotos, cargos) y qué prueba cada pieza.',
      'Calibra la probabilidad según fortaleza de la evidencia, no según el monto.',
      'La respuesta a la OTA debe ser factual y enfocada en el daño económico demostrable.',
    ].join('\n'),
  },
]

async function main() {
  console.log('🌱 Seeding dispute agent starter skills...')

  const systemUser = await db.user.upsert({
    where: { id: 'dev-user-001' },
    update: {},
    create: {
      id: 'dev-user-001',
      email: 'dev@miamivacationrentals.com',
      name: 'System (Agent Seed)',
      role: 'super_admin',
    },
  })

  for (const s of STARTERS) {
    const existing = await db.disputeSkill.findFirst({ where: { name: s.name } })
    if (existing) {
      console.log(`  • ${s.name} (exists, skipped)`)
      continue
    }
    await db.disputeSkill.create({
      data: {
        name: s.name,
        caseType: s.caseType,
        ota: s.ota,
        instructions: s.instructions,
        enabled: true,
        createdById: systemUser.id,
      },
    })
    console.log(`  ✓ ${s.name}`)
  }
  console.log('✅ Agent starter skills seeded.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
