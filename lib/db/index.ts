import { PrismaClient } from '@prisma/client'
import { boundPoolUrl } from './pool'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: boundPoolUrl(process.env.DATABASE_URL, 5) } },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

// Cache on globalThis in every environment. In dev this prevents hot-reload
// from spawning a new client per reload; in serverless it lets warm instances
// reuse a single pooled client instead of opening fresh connections.
globalForPrisma.prisma = db
