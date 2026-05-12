// ═══════════════════════════════════════════════════════════════════════════
// Risk / Chargebacks — read-only Prisma client for the `risk_agent` schema.
//
// READ ONLY. The risk_agent.* tables are owned by the n8n workflow at
// service.mvr-management.com. This client must never write to those tables.
// Enforce at the DB level by connecting with a SELECT-only Postgres role
// (currently `risk_agent_writer` while the read-only role is being provisioned;
// rotate to `mvr_risk_reader` ASAP).
//
// Connection lives in RISK_DATABASE_URL (see .env.example).
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from '@/lib/generated/risk-client'

const globalForRiskPrisma = globalThis as unknown as { riskPrisma: PrismaClient }

export const riskDb =
  globalForRiskPrisma.riskPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForRiskPrisma.riskPrisma = riskDb
