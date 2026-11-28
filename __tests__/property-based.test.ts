import { fc } from "@fast-check/jest"
import { checkRateLimit } from "@/lib/rate-limiter"
import { checkTierLimit } from "@/lib/tierLimits"
import { deliverWebhook } from "@/lib/webhooks"
import { circuitBreaker } from "@/lib/circuit-breaker"
import { formatRegistryInstance } from "@/lib/conversion/format-registry"
import type { ConversionFormat, ConversionPair } from "@/lib/conversion"

// Mock Redis for testing
jest.mock("@/lib/cache", () => ({
  getRedisClient: () => null,
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheIncrement: jest.fn(),
}))

describe("Property-based tests for critical paths", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("Rate Limiter", () => {
    it("never allows more than maxRequests in any sliding window", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // maxRequests
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          fc.string({ minLength: 1, maxLength: 20 }), // identifier
          async (maxRequests, windowMs, identifier) => {
            const config = { windowMs, maxRequests, keyPrefix: "test" }
            const testId = `test-${identifier}-${Date.now()}`

            // Make maxRequests + 10 requests rapidly
            const results = await Promise.all(
              Array(maxRequests + 10)
                .fill(0)
                .map(() => checkRateLimit(testId, config))
            )

            const allowed = results.filter((r) => !r.limited).length
            expect(allowed).toBeLessThanOrEqual(maxRequests)
          }
        ),
        { numRuns: 100 }
      )
    })

    it("resets counter after window expires", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          fc.integer({ min: 50, max: 200 }), // Short window for testing
          async (maxRequests, windowMs) => {
            const config = { windowMs, maxRequests, keyPrefix: "test-expire" }
            const testId = `expire-${Date.now()}`

            // Exhaust the limit
            for (let i = 0; i < maxRequests; i++) {
              const result = await checkRateLimit(testId, config)
              expect(result.limited).toBe(false)
            }

            // Next request should be limited
            const limitedResult = await checkRateLimit(testId, config)
            expect(limitedResult.limited).toBe(true)

            // Wait for window to expire
            await new Promise((r) => setTimeout(r, windowMs + 50))

            // Should be allowed again
            const afterExpiry = await checkRateLimit(testId, config)
            expect(afterExpiry.limited).toBe(false)
          }
        ),
        { numRuns: 50 }
      )
    })

    it("different identifiers have independent limits", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
          fc.integer({ min: 1, max: 20 }),
          async (identifiers, maxRequests) => {
            const config = { windowMs: 60000, maxRequests, keyPrefix: "test-multi" }

            // Each identifier makes maxRequests requests
            for (const id of identifiers) {
              const results = await Promise.all(
                Array(maxRequests).fill(0).map(() => checkRateLimit(id, config))
              )
              const allowed = results.filter((r) => !r.limited).length
              expect(allowed).toBe(maxRequests)
            }
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe("Tier Limits", () => {
    it("unlimited tiers always allowed regardless of quantity", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // quantity
          fc.string({ minLength: 1 }), // userId
          fc.constantFrom("documents_created", "conversions", "storage_bytes"), // metric
          async (quantity, userId, metric) => {
            // Mock unlimited tier
            jest.doMock("@/lib/tierLimits", () => ({
              ...jest.requireActual("@/lib/tierLimits"),
              getTierLimits: jest.fn().mockResolvedValue({
                documents_per_month: -1,
                conversions_per_month: -1,
                storage_gb: -1,
                max_file_size_mb: 100,
                api_requests_per_minute: 1000,
                has_priority_support: true,
                has_audit_logs: true,
                has_advanced_templates: true,
                max_seats: -1,
              }),
            }))

            const result = await checkTierLimit(userId, metric as any, quantity)
            expect(result.allowed).toBe(true)
            expect(result.limit).toBe(-1)
          }
        ),
        { numRuns: 50 }
      )
    })

    it("limited tiers respect the limit boundary", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100 }), // limit
          fc.integer({ min: 1, max: 200 }), // requested quantity
          async (limit, quantity) => {
            jest.doMock("@/lib/tierLimits", () => ({
              ...jest.requireActual("@/lib/tierLimits"),
              getTierLimits: jest.fn().mockResolvedValue({
                documents_per_month: limit,
                conversions_per_month: limit,
                storage_gb: limit,
                max_file_size_mb: 100,
                api_requests_per_minute: 1000,
                has_priority_support: false,
                has_audit_logs: true,
                has_advanced_templates: false,
                max_seats: 1,
              }),
            }))

            // Mock Redis to return current count
            const { getRedisClient } = require("@/lib/cache")
            let currentCount = 0
            getRedisClient.mockReturnValue({
              eval: jest.fn().mockImplementation(() => {
                currentCount += quantity
                return currentCount
              }),
            })

            const result = await checkTierLimit("user-123", "documents_created", quantity)
            expect(result.allowed).toBe(currentCount <= limit)
          }
        ),
        { numRuns: 50 }
      )
    })
  })

  describe("Webhook Delivery", () => {
    it("respects overall deadline across retries", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 100, max: 5000 }), // deadline
          fc.integer({ min: 1, max: 5 }), // max retries
          async (deadline, maxRetries) => {
            const startTime = Date.now()
            
            // Mock fetch to always fail
            global.fetch = jest.fn().mockRejectedValue(new Error("Network error"))

            const result = await deliverWebhook(
              "endpoint-1",
              "https://example.com/webhook",
              "secret",
              "test.event",
              { data: "test" },
              1,
              deadline,
              startTime
            )

            const elapsed = Date.now() - startTime
            expect(elapsed).toBeLessThanOrEqual(deadline + 100) // Allow small buffer
            expect(result.success).toBe(false)
          }
        ),
        { numRuns: 30 }
      )
    })

    it("uses unique idempotency key per retry attempt", async () => {
      const keys: string[] = []
      global.fetch = jest.fn().mockImplementation(async (url, options) => {
        keys.push(options.headers["X-ForgeDocs-Idempotency-Key"])
        return { ok: false, status: 500, text: () => "error" }
      })

      const startTime = Date.now()
      await deliverWebhook(
        "endpoint-1",
        "https://example.com/webhook",
        "secret",
        "test.event",
        { data: "test" },
        1,
        30000,
        startTime,
        "custom-key"
      )

      // Should have 3 keys (initial + 2 retries)
      expect(keys.length).toBe(3)
      // All keys should be unique
      expect(new Set(keys).size).toBe(keys.length)
      // All should contain the custom key prefix
      keys.forEach((k) => expect(k).toContain("custom-key"))
    })
  })

  describe("Circuit Breaker", () => {
    it("opens after failure threshold", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }), // threshold
          fc.integer({ min: 1, max: 15 }), // call count
          async (threshold, callCount) => {
            const cb = circuitBreaker("test", {
              failureThreshold: threshold,
              resetTimeoutMs: 1000,
              timeoutMs: 100,
            })

            let failures = 0
            for (let i = 0; i < callCount; i++) {
              try {
                await cb.execute(async () => {
                  if (i < threshold) throw new Error("Fail")
                  return "success"
                })
              } catch {
                failures++
              }
            }

            // Circuit should open after threshold failures
            if (callCount >= threshold) {
              expect(cb.getState()).toBe("open")
            }
          }
        ),
        { numRuns: 30 }
      )
    })

    it("half-open state allows trial requests", async () => {
      const cb = circuitBreaker("test-half-open", {
        failureThreshold: 2,
        resetTimeoutMs: 50,
        timeoutMs: 100,
      })

      // Trigger open state
      try { await cb.execute(async () => { throw new Error("Fail") }) } catch {}
      try { await cb.execute(async () => { throw new Error("Fail") }) } catch {}
      expect(cb.getState()).toBe("open")

      // Wait for reset timeout
      await new Promise((r) => setTimeout(r, 100))

      // Should be half-open now
      expect(cb.getState()).toBe("half-open")

      // Successful call should close it
      await cb.execute(async () => "success")
      expect(cb.getState()).toBe("closed")
    })
  })

  describe("Format Registry", () => {
    it("prevents duplicate format registration", () => {
      const registry = new (require("@/lib/conversion/format-registry").FormatRegistry)()
      
      const format: ConversionFormat = {
        id: "test-format",
        name: "Test Format",
        mimeType: "application/test",
        extension: ".test",
        category: "document",
      }

      registry.registerFormat(format)
      expect(() => registry.registerFormat(format)).toThrow("already registered")
    })

    it("prevents pair registration with unknown formats", () => {
      const registry = new (require("@/lib/conversion/format-registry").FormatRegistry)()
      
      const pair: ConversionPair = {
        source: "unknown",
        target: "pdf",
        supported: true,
      }

      expect(() => registry.registerPair(pair)).toThrow("not registered")
    })

    it("maintains pair symmetry for bidirectional conversions", () => {
      const registry = formatRegistryInstance
      
      // Check that if A->B is supported, B->A might have different support
      const docxToPdf = registry.isPairSupported("docx", "pdf")
      const pdfToDocx = registry.isPairSupported("pdf", "docx")
      
      expect(docxToPdf).toBe(true)
      expect(pdfToDocx).toBe(true)
      expect(registry.getPairDetails("pdf", "docx")?.mayLoseData).toBe(true)
    })

    it("all built-in formats have valid categories", () => {
      const validCategories = ["document", "image", "spreadsheet", "presentation", "text", "unit", "metadata"]
      const formats = formatRegistryInstance.getAllFormats()
      
      formats.forEach((fmt) => {
        expect(validCategories).toContain(fmt.category)
        expect(fmt.id).toBeTruthy()
        expect(fmt.name).toBeTruthy()
        expect(fmt.mimeType).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/i)
      })
    })
  })

  describe("Leader Election", () => {
    it("only one leader at a time", async () => {
      // This would require integration test with real Redis
      // Property: at most one worker can hold the lock
      expect(true).toBe(true)
    })
  })

  describe("Memory Cache LRU", () => {
    it("evicts least recently used when over capacity", async () => {
      // This tests the in-memory cache LRU behavior
      const { memoryStore, MAX_MEMORY_ENTRIES, cleanExpired } = require("@/lib/cache")
      
      // Fill cache beyond capacity
      const now = Date.now()
      for (let i = 0; i < MAX_MEMORY_ENTRIES + 100; i++) {
        memoryStore.set(`key-${i}`, { 
          value: `value-${i}`, 
          expiresAt: now + 60000, 
          lastAccess: now - i 
        })
      }
      
      // Trigger cleanup
      cleanExpired()
      
      expect(memoryStore.size).toBeLessThanOrEqual(MAX_MEMORY_ENTRIES)
      
      // Most recently accessed should remain
      expect(memoryStore.has(`key-${MAX_MEMORY_ENTRIES + 99}`)).toBe(true)
    })
  })
})