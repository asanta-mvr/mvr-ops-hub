// Per-user rate limiting for the analyze endpoint (spec §15: ~10 req/min).
// Sliding-window via a Redis sorted set. Degrades to "allow" when Redis is
// unset (CLAUDE.md "Redis is optional" deviation), so local dev works without it.

import { redis } from '@/lib/redis'

const WINDOW_MS = 60_000
const MAX_REQUESTS = 10

export type RateLimitResult = { ok: true } | { ok: false; retryAfter: number }

export async function checkAnalyzeRateLimit(userId: string): Promise<RateLimitResult> {
  if (!redis) return { ok: true } // Redis disabled — no-op

  const key = `dispute:analyze:${userId}`
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  try {
    const pipeline = redis.pipeline()
    pipeline.zremrangebyscore(key, 0, windowStart) // evict old entries
    pipeline.zadd(key, now, `${now}`) // record this attempt
    pipeline.zcard(key) // count in window
    pipeline.pexpire(key, WINDOW_MS) // self-clean
    const results = await pipeline.exec()

    // zcard is the 3rd command (index 2): [err, value]
    const count = Number(results?.[2]?.[1] ?? 0)
    if (count > MAX_REQUESTS) {
      return { ok: false, retryAfter: Math.ceil(WINDOW_MS / 1000) }
    }
    return { ok: true }
  } catch (e) {
    // Fail open — a Redis hiccup must not block analysis.
    console.error('[dispute rate-limit] redis error', e)
    return { ok: true }
  }
}
