import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) throw new Error('REDIS_URL environment variable is not set')

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
