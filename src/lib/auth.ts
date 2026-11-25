import "server-only"
import { getRouteClient } from "@/lib/supabase"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"
import { getClientIdentifier } from "@/lib/client-identifier"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_TTL_SECONDS = Math.ceil(LOCKOUT_DURATION_MS / 1000)

function getLockoutKey(identifier: string): string {
  return `lockout:${identifier}`
}

export async function checkLoginAttempts(identifier: string): Promise<{ allowed: boolean; remainingMs?: number }> {
  const lockoutKey = `${getLockoutKey(identifier)}:lockout`
  const entry = await cacheGet<{ lockoutUntil: number }>(lockoutKey)
  if (!entry) return { allowed: true }

  const now = Date.now()
  if (now > entry.lockoutUntil) {
    await cacheDel(lockoutKey)
    return { allowed: true }
  }

  return { allowed: false, remainingMs: entry.lockoutUntil - now }
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)
  const now = Date.now()

  // Atomic increment via Redis INCR — single operation, no TOCTOU race.
  // Use the cache layer's increment to atomically track the failure count.
  const { cacheIncrement } = await import("@/lib/cache")
  const count = await cacheIncrement(key, LOCKOUT_TTL_SECONDS)

  if (count >= LOCKOUT_THRESHOLD) {
    // Set lockout only after threshold is reached atomically.
    const lockoutKey = `${key}:lockout`
    const lockoutEntry = { lockoutUntil: now + LOCKOUT_DURATION_MS }
    await cacheSet(lockoutKey, lockoutEntry, LOCKOUT_TTL_SECONDS)
  }
}

export async function clearFailedAttempts(identifier: string): Promise<void> {
  await cacheDel(getLockoutKey(identifier))
  await cacheDel(`${getLockoutKey(identifier)}:lockout`)
}
