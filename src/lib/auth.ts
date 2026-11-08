import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"
import { cacheGet, cacheSet, cacheDel } from "@/lib/cache"

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

export const passwordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
})

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse(password)
  if (result.success) {
    return { valid: true, errors: [] }
  }
  return { valid: false, errors: result.error.issues.map((e) => e.message) }
}