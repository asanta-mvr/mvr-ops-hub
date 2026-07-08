// ═══════════════════════════════════════════════════════════════════════════
// Serverless connection-pool bounding for Prisma against Cloud SQL.
//
// Vercel (Fluid Compute) runs many concurrent function instances. Each Prisma
// client opens its own pool of `num_cpus * 2 + 1` connections by default, so
// pools multiply across instances and exhaust Cloud SQL's `max_connections`
// ("remaining connection slots are reserved for roles with privileges of the
// pg_use_reserved_connections role"). Capping `connection_limit` per instance
// keeps the total bounded regardless of how many instances Vercel spins up.
//
// This overrides the URL in code so the cap applies even if the deployed
// DATABASE_URL / RISK_DATABASE_URL env vars don't include the query params.
// An explicit `connection_limit` already present in the env URL is respected.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Append `connection_limit` and `pool_timeout` to a Postgres connection URL
 * unless the URL already sets a connection limit. Returns the URL untouched
 * when it is undefined so Prisma surfaces its own "missing env var" error.
 */
export function boundPoolUrl(url: string | undefined, limit: number): string | undefined {
  if (!url) return url
  if (url.includes('connection_limit')) return url
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}connection_limit=${limit}&pool_timeout=20`
}
