export type CircuitState = "closed" | "open" | "half-open"

export interface CircuitBreakerOptions {
  /** Number of failures before opening the circuit */
  failureThreshold: number
  /** Time in ms before attempting to close (try half-open) */
  resetTimeoutMs: number
  /** Maximum time in ms for a call before it's considered failed */
  timeoutMs?: number
  /** Use Redis-backed state for cross-process consistency */
  useRedis?: boolean
  /** Redis key prefix for circuit state */
  redisKeyPrefix?: string
}

/**
 * Circuit breaker state for a single external service.
 * States:
 *   closed    - Normal operation, calls pass through
 *   open      - Circuit is open, calls fail fast without attempting
 *   half-open - Testing if service has recovered; single call allowed
 */
export interface CircuitBreakerState {
  state: CircuitState
  failures: number
  lastFailureTime: number | null
  nextAttemptTime: number | null
}

export class CircuitBreaker {
  private state: CircuitBreakerState
  private redisClient: any | null = null
  private stateDirty = false // true when in-memory state differs from persisted Redis state

  constructor(
    private name: string,
    private options: CircuitBreakerOptions
  ) {
    this.state = {
      state: "closed",
      failures: 0,
      lastFailureTime: null,
      nextAttemptTime: null,
    }

    if (options.useRedis) {
      try {
        const Redis = require("ioredis")
        this.redisClient = new Redis({
          host: process.env.REDIS_HOST || "localhost",
          port: parseInt(process.env.REDIS_PORT || "6379", 10),
          lazyConnect: true,
        })
      } catch {
        // Redis unavailable — fall back to in-memory state
      }
    }
  }

  private async getRedisStateKey(): Promise<string> {
    return `${this.options.redisKeyPrefix ?? "circuit"}:${this.name}`
  }

  async getState(): Promise<CircuitBreakerState> {
    if (this.redisClient && !this.stateDirty) {
      // Serve from in-memory state when we know it's in sync with Redis.
      // Avoids a Redis round-trip on every health check / read.
      return { ...this.state }
    }
    if (this.redisClient) {
      try {
        const key = await this.getRedisStateKey()
        const data = await this.redisClient.get(key)
        if (data) {
          const parsed = JSON.parse(data)
          this.state = {
            state: parsed.state,
            failures: parsed.failures ?? 0,
            lastFailureTime: parsed.lastFailureTime ?? null,
            nextAttemptTime: parsed.nextAttemptTime ?? null,
          }
          this.stateDirty = false
          return { ...this.state }
        }
      } catch {
        // Fall back to in-memory state
      }
    }
    return { ...this.state }
  }

  private async persistState(): Promise<void> {
    if (this.redisClient) {
      try {
        const key = await this.getRedisStateKey()
        await this.redisClient.set(key, JSON.stringify(this.state), "EX", Math.ceil(this.options.resetTimeoutMs / 1000) * 2)
        this.stateDirty = false
      } catch {
        // Best-effort persistence
      }
    }
  }

  isOpen(): boolean {
    if (this.state.state === "open") {
      // Check if reset timeout has elapsed — move to half-open
      if (this.state.nextAttemptTime && Date.now() >= this.state.nextAttemptTime) {
        this.state.state = "half-open"
        this.stateDirty = true
        return false
      }
      return true
    }
    return false
  }

  recordSuccess(): void {
    this.state.state = "closed"
    this.state.failures = 0
    this.state.lastFailureTime = null
    this.state.nextAttemptTime = null
    this.stateDirty = true
    this.persistState()
  }

  recordFailure(): void {
    this.state.failures += 1
    this.state.lastFailureTime = Date.now()

    if (this.state.state === "half-open") {
      // Single test call failed — go back to open
      this.state.state = "open"
      this.state.nextAttemptTime = Date.now() + this.options.resetTimeoutMs
    } else if (this.state.failures >= this.options.failureThreshold) {
      this.state.state = "open"
      this.state.nextAttemptTime = Date.now() + this.options.resetTimeoutMs
    }
    this.stateDirty = true
    this.persistState()
  }

  /**
   * Executes a function through the circuit breaker.
   * Throws CircuitOpenError if the circuit is open.
   * Propagates the original error if the call fails.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      const err = new Error(`Circuit breaker "${this.name}" is open`) as Error & { code: string; statusCode: number }
      err.code = "CIRCUIT_OPEN"
      err.statusCode = 503
      throw err
    }

    const controller = new AbortController()
    const timeoutId = this.options.timeoutMs
      ? setTimeout(() => controller.abort(), this.options.timeoutMs)
      : null

    try {
      const result = await fn()
      this.recordSuccess()
      return result
    } catch (error) {
      this.recordFailure()
      throw error
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }
}

// Circuit breaker instances for external services
export const stripeCircuitBreaker = new CircuitBreaker("stripe", {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  timeoutMs: 10000, // 10 second timeout
  useRedis: true,
  redisKeyPrefix: "circuit",
})

export const resendCircuitBreaker = new CircuitBreaker("resend", {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  timeoutMs: 10000,
  useRedis: true,
  redisKeyPrefix: "circuit",
})

export const openaiCircuitBreaker = new CircuitBreaker("openai", {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  timeoutMs: 30000, // 30 seconds for AI calls
  useRedis: true,
  redisKeyPrefix: "circuit",
})

export const supabaseCircuitBreaker = new CircuitBreaker("supabase", {
  failureThreshold: 10,
  resetTimeoutMs: 15000,
  timeoutMs: 10000,
  useRedis: true,
  redisKeyPrefix: "circuit",
})

/**
 * Gets all circuit breaker states for monitoring/health checks.
 */
export async function getAllCircuitStates(): Promise<Record<string, CircuitBreakerState>> {
  return {
    stripe: await stripeCircuitBreaker.getState(),
    resend: await resendCircuitBreaker.getState(),
    openai: await openaiCircuitBreaker.getState(),
    supabase: await supabaseCircuitBreaker.getState(),
  }
}
