import Redis from "ioredis"

let redisClient: Redis | null = null
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

// In-memory fallback store for tests and when Redis is unavailable
const memoryStore = new Map<string, { value: string; expiresAt: number }>()

export function getRedisClient(): Redis | null {
  if (isTestEnv) {
    return null
  }
  
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

function isExpired(entry: { expiresAt: number }): boolean {
  return Date.now() > entry.expiresAt
}

function cleanExpired() {
  const now = Date.now()
  for (const [key, entry] of memoryStore.entries()) {
    if (now > entry.expiresAt) {
      memoryStore.delete(key)
    }
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (isTestEnv) {
    cleanExpired()
    const entry = memoryStore.get(key)
    if (!entry || isExpired(entry)) {
      memoryStore.delete(key)
      return null
    }
    try {
      return JSON.parse(entry.value) as T
    } catch {
      return null
    }
  }

  try {
    const client = getRedisClient()
    if (!client) return null
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
  const expiresAt = Date.now() + ttlSeconds * 1000
  const serialized = JSON.stringify(value)

  if (isTestEnv) {
    memoryStore.set(key, { value: serialized, expiresAt })
    return
  }

  try {
    const client = getRedisClient()
    if (!client) return
    if (client.status === "wait") {
      await client.connect()
    }
    await client.setex(key, ttlSeconds, serialized)
  } catch {
    // Cache failure is non-fatal
  }
}

export async function cacheDel(key: string): Promise<void> {
  if (isTestEnv) {
    if (key.includes("*")) {
      const prefix = key.replace("*", "")
      for (const k of memoryStore.keys()) {
        if (k.startsWith(prefix)) {
          memoryStore.delete(k)
        }
      }
    } else {
      memoryStore.delete(key)
    }
    return
  }

  try {
    const client = getRedisClient()
    if (!client) return
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
  if (isTestEnv) {
    cleanExpired()
    const entry = memoryStore.get(key)
    return entry !== undefined && !isExpired(entry)
  }

  try {
    const client = getRedisClient()
    if (!client) return false
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
  if (isTestEnv) {
    cleanExpired()
    const entry = memoryStore.get(key)
    const current = entry ? parseInt(entry.value, 10) || 0 : 0
    const next = current + 1
    memoryStore.set(key, { value: String(next), expiresAt: Date.now() + ttlSeconds * 1000 })
    return next
  }

  try {
    const client = getRedisClient()
    if (!client) return 0
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
  memoryStore.clear()
}

// Connection pool status for monitoring
export async function getRedisPoolStatus(): Promise<{
  status: string
  connected: boolean
  memory?: string
  clients?: number
}> {
  if (isTestEnv) {
    return {
      status: "healthy",
      connected: false,
    }
  }

  try {
    const client = getRedisClient()
    if (!client) {
      return { status: "unhealthy", connected: false }
    }
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