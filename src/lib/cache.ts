import Redis from "ioredis"

let redisClient: Redis | null = null

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379"
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectionName: "forgedocs-app",
    })

    redisClient.on("error", (err: Error) => {
      console.error("Redis connection error:", err)
    })

    redisClient.on("connect", () => {
      console.log("Redis connected")
    })
  }
  return redisClient
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    const value = await client.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    await client.setex(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    // Handle wildcard keys
    if (key.includes("*")) {
      const keys = await client.keys(key)
      if (keys.length > 0) {
        await client.del(...keys)
      }
    } else {
      await client.del(key)
    }
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheExists(key: string): Promise<boolean> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    const result = await client.exists(key)
    return result === 1
  } catch {
    return false
  }
}

export async function cacheIncrement(key: string, ttlSeconds: number): Promise<number> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    const count = await client.incr(key)
    if (count === 1) {
      await client.expire(key, ttlSeconds)
    }
    return count
  } catch {
    return 0
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}

// Connection pool status for monitoring
export async function getRedisPoolStatus(): Promise<{
  status: string
  connected: boolean
  memory?: string
  clients?: number
}> {
  try {
    const client = getRedisClient()
    if (client.status === "wait") {
      await client.connect()
    }
    const info = await client.info("memory")
    const clients = await client.info("clients")
    return {
      status: "healthy",
      connected: true,
      memory: info.match(/used_memory_human:(\S+)/)?.[1],
      clients: parseInt(clients.match(/connected_clients:(\d+)/)?.[1] || "0"),
    }
  } catch {
    return {
      status: "unhealthy",
      connected: false,
    }
  }
}