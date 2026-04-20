import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | null }

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL
  if (!url) {
    console.warn('[Redis] REDIS_URL not set — Redis disabled')
    return null
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  })

  client.on('error', (err) => {
    console.error('[Redis] Connection error:', err)
  })

  return client
}

export const redis = globalForRedis.redis ?? createRedisClient()

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
