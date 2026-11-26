import "server-only"
import { getPooledRouteClient } from "@/lib/supabase"
import { cacheGet, cacheDel, cacheEval } from "@/lib/cache"
import { getClientIdentifier } from "@/lib/client-identifier"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_TTL_SECONDS = Math.ceil(LOCKOUT_DURATION_MS / 1000)

function getLockoutKey(identifier: string): string {
  return `lockout:${identifier}`
}

export async function checkLoginAttempts(identifier: string): Promise<{ allowed: boolean; remainingMs?: number }> {
  const lockoutKey = `${getLockoutKey(identifier)}:lockout`
  const entry = await cacheGet<number>(lockoutKey)
  if (!entry) return { allowed: true }

  const now = Date.now()
  // `entry` is the lockout-until timestamp stored as a number. An undefined/missing
  // value means no lockout. Delete expired entries lazily on access.
  if (now > entry) {
    void cacheDel(lockoutKey)
    return { allowed: true }
  }

  return { allowed: false, remainingMs: entry - now }
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

export async function recordFailedAttempt(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)
  const now = Date.now()
  const lockoutUntil = now + LOCKOUT_DURATION_MS

  // Atomic increment and lockout via Lua to prevent TOCTOU race between
  // incrementing the failure count and setting the lockout.
  await cacheEval(key, LOCKOUT_TTL_SECONDS, String(LOCKOUT_THRESHOLD), String(lockoutUntil))
}

export async function clearFailedAttempts(identifier: string): Promise<void> {
  await cacheDel(getLockoutKey(identifier))
  await cacheDel(`${getLockoutKey(identifier)}:lockout`)
}
