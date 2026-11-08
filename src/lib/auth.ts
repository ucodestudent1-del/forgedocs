import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { z } from "zod"

// Account lockout tracking (in-memory, use Redis in production)
const failedLoginAttempts = new Map<string, { count: number; lockoutUntil: number }>()
const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  return ip
}

export function checkLoginAttempts(identifier: string): { allowed: boolean; remainingMs?: number } {
  const entry = failedLoginAttempts.get(identifier)
  if (!entry) return { allowed: true }

  if (now() > entry.lockoutUntil) {
    failedLoginAttempts.delete(identifier)
    return { allowed: true }
  }

  return { allowed: false, remainingMs: entry.lockoutUntil - now }
}

export function recordFailedAttempt(identifier: string): void {
  const entry = failedLoginAttempts.get(identifier) || { count: 0, lockoutUntil: 0 }
  entry.count++
  if (entry.count >= LOCKOUT_THRESHOLD) {
    entry.lockoutUntil = now() + LOCKOUT_DURATION_MS
  }
  failedLoginAttempts.set(identifier, entry)
}

export function clearFailedAttempts(identifier: string): void {
  failedLoginAttempts.delete(identifier)
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
  return { valid: false, errors: result.error.errors.map((e) => e.message) }
}
