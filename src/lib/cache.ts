import "server-only"
import Redis from "ioredis"
import logger from "@/lib/logger"

let redisClient: Redis | null = null
let connectionPromise: Promise<void> | null = null
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined

// In-memory fallback store for tests and when Redis is unavailable
const memoryStore = new Map<string, { value: string; expiresAt: number }>()

export function getRedisClient(): Redis | null {
  if (isTestEnv) {
    return null
  }

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    logger.warn("REDIS_URL is not configured — cache and rate limiting will be disabled")
    return null
  }

  if (!redisClient) {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectionName: "forgedocs-app",
    })

    redisClient.on("error", (err: Error) => {
      logger.error("Redis connection error", { error: err.message, stack: err.stack })
    })

    redisClient.on("connect", () => {
      logger.info("Redis connected")
    })

    connectionPromise = redisClient.connect()
  }
  return redisClient
}

async function ensureConnected(client: Redis): Promise<void> {
  if (connectionPromise) {
    await connectionPromise
  }
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
    await ensureConnected(client)
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
    await ensureConnected(client)
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
    await ensureConnected(client)
    // Handle wildcard keys using SCAN (non-blocking)
    if (key.includes("*")) {
      const pattern = key
      let cursor = "0"
      const keysToDelete: string[] = []
      do {
        const [newCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100)
        cursor = newCursor
        keysToDelete.push(...keys)
      } while (cursor !== "0")
      if (keysToDelete.length > 0) {
        await client.del(...keysToDelete)
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
    await ensureConnected(client)
    const result = await client.exists(key)
    return result === 1
  } catch {
    return false
  }
}

const INCR_WITH_EXPIRE_LUA = `
  local count = redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  return count
`

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
    await ensureConnected(client)
    // Always refresh TTL on increment so keys never persist without expiry.
    const count = await client.eval(INCR_WITH_EXPIRE_LUA, 1, key, ttlSeconds)
    return Number(count)
  } catch {
    return 0
  }
}

const INCREMENT_AND_LOCK_LUA = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  if count >= tonumber(ARGV[2]) then
    local lockoutUntil = tonumber(ARGV[3])
    local existingLockout = redis.call('GET', KEYS[1] .. ':lockout')
    if not existingLockout or tonumber(existingLockout) < lockoutUntil then
      redis.call('SET', KEYS[1] .. ':lockout', lockoutUntil, 'EX', ARGV[1])
    end
  end
  return count
`

export async function cacheEval(key: string, ttlSeconds: number, threshold: string, lockoutUntilMs: string): Promise<number> {
  if (isTestEnv) {
    cleanExpired()
    const entry = memoryStore.get(key)
    const current = entry ? parseInt(entry.value, 10) || 0 : 0
    const next = current + 1
    memoryStore.set(key, { value: String(next), expiresAt: Date.now() + ttlSeconds * 1000 })

    // Mirror production Lua lockout behavior: when threshold is reached, set
    // the lockout timestamp so subsequent checkLoginAttempts calls fail-closed.
    const thresholdNum = parseInt(threshold, 10)
    if (next >= thresholdNum) {
      const lockoutKey = `${key}:lockout`
      const existing = memoryStore.get(lockoutKey)
      const existingLockout = existing ? parseInt(existing.value, 10) : 0
      const lockoutUntil = parseInt(lockoutUntilMs, 10)
      if (!existing || existingLockout < lockoutUntil) {
        memoryStore.set(lockoutKey, { value: String(lockoutUntil), expiresAt: Date.now() + ttlSeconds * 1000 })
      }
    }

    return next
  }

  try {
    const client = getRedisClient()
    if (!client) return 0
    await ensureConnected(client)
    const count = await client.eval(INCREMENT_AND_LOCK_LUA, 1, key, ttlSeconds, threshold, lockoutUntilMs)
    return Number(count)
  } catch {
    return 0
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
    connectionPromise = null
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
    await ensureConnected(client)
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