import { createClient } from "redis"

let redisClient: ReturnType<typeof createClient> | null = null

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: process.env.REDIS_URL,
    })
    redisClient.on("error", (err) => console.error("Redis Client Error", err))
    redisClient.connect().catch(console.error)
  }
  return redisClient
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
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
    await client.set(key, JSON.stringify(value), { EX: ttlSeconds })
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    await client.del(key)
  } catch {
    // Cache failure is non-fatal
  }
}
