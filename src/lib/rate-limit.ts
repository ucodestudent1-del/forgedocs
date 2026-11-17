// Re-exports from the canonical rate-limiter implementation.
// src/lib/rate-limiter.ts is the single source of truth for rate limiting.
// This module exists for backward compatibility with existing imports.

export {
  createRateLimiter,
  createRateLimiterByPath,
  rateLimitMiddleware,
  authRateLimit,
  apiRateLimit,
  documentRateLimit,
  type RateLimitInfo,
} from "@/lib/rate-limiter"

// Alias for backward compatibility: rateLimit(config) === createRateLimiter(config)
export { createRateLimiter as rateLimit } from "@/lib/rate-limiter"
export type { RateLimitConfig } from "@/lib/rate-limiter"

// Deprecated: per-replica in-memory store removed. Rate limiting is now
// Redis-backed and shared across all replicas. Fail-closed when Redis is unavailable.
export const rateLimitStore: Map<string, never> = new Map()
