import "server-only"
import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"
import { passwordSchema, validatePassword } from "@/lib/password"

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_TTL_SECONDS = Math.ceil(LOCKOUT_DURATION_MS / 1000)

interface LockoutEntry {
  count: number
  lockoutUntil: number
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  return ip
}

function getLockoutKey(identifier: string): string {
  return `lockout:${identifier}`
}

export async function checkLoginAttempts(identifier: string): Promise<{ allowed: boolean; remainingMs?: number }> {
  const entry = await cacheGet<LockoutEntry>(getLockoutKey(identifier))
  if (!entry) return { allowed: true }

  const now = Date.now()
  if (now > entry.lockoutUntil) {
    await cacheDel(getLockoutKey(identifier))
    return { allowed: true }
  }

  return { allowed: false, remainingMs: entry.lockoutUntil - now }
}

export async function recordFailedAttempt(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)
  const entry = (await cacheGet<LockoutEntry>(key)) || { count: 0, lockoutUntil: 0 }
  
  entry.count++
  if (entry.count >= LOCKOUT_THRESHOLD) {
    entry.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS
  }
  
  await cacheSet(key, entry, LOCKOUT_TTL_SECONDS)
}

export async function clearFailedAttempts(identifier: string): Promise<void> {
  await cacheDel(getLockoutKey(identifier))
}

function now(): number {
  return Date.now()
}