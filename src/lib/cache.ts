import Redis from "ioredis"

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null // Stop retrying
        return Math.min(times * 200, 2000)
      },
      lazyConnect: true,
    })
    redisClient.on("error", (err) => console.error("Redis Client Error", err))
  }
  return redisClient
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    await client.connect()
    const value = await client.get(key)
    if (value === null) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
  try {
    const client = getRedisClient()
    await client.connect()
    await client.set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.connect()
    await client.del(key)
  } catch {
    // Cache failure is non-fatal
  }
}