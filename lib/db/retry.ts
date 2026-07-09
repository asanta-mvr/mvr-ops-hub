// ═══════════════════════════════════════════════════════════════════════════
// Transient-connection retry for Prisma against Cloud SQL.
//
// Long-running routes (e.g. the Guesty listing sync) open a DB connection, then
// spend minutes on paced HTTP calls before writing results. Cloud SQL / GCP drop
// TCP connections left idle for a few minutes, so the first query after the gap
// reuses a dead pooled connection and fails with P1017 "Server has closed the
// connection." Prisma establishes a fresh connection on the next attempt, so a
// bounded retry transparently recovers instead of aborting the whole sync.
//
// Only connection-level errors are retried — query/constraint errors re-throw
// immediately so real bugs still surface.
// ═══════════════════════════════════════════════════════════════════════════

// Prisma error codes for connection failures (not query/constraint failures):
//   P1017 — server has closed the connection
//   P1001 — can't reach database server
//   P1008 — operation timed out (often a dead connection)
const TRANSIENT_CODES = new Set(['P1017', 'P1001', 'P1008'])

const TRANSIENT_MESSAGE_MARKERS = [
  'Server has closed the connection',
  "Can't reach database server",
  'Connection reset by peer',
  'connection closed',
  'Timed out fetching a new connection',
]

export function isTransientConnectionError(err: unknown): boolean {
  const code = (err as { code?: unknown } | null)?.code
  if (typeof code === 'string' && TRANSIENT_CODES.has(code)) return true
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  return TRANSIENT_MESSAGE_MARKERS.some((marker) => message.includes(marker))
}

/**
 * Run a DB operation, retrying only on transient connection errors. On retry
 * Prisma opens a fresh connection, recovering from a dropped idle connection.
 *
 * @param fn      the DB operation (must be idempotent — upserts and updates are)
 * @param retries additional attempts after the first (default 2 → up to 3 tries)
 */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt === retries || !isTransientConnectionError(err)) throw err
      // Small linear backoff (200ms, 400ms) to let a new connection establish.
      await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
    }
  }
  throw lastError
}
