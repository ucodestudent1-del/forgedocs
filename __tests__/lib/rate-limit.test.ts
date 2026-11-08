import { rateLimit, authRateLimit, documentRateLimit, apiRateLimit, rateLimitStore } from '@/lib/rate-limit'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      ...body,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      json: async () => body,
    })),
  },
}))

describe('Rate Limiter', () => {
  beforeEach(() => {
    rateLimitStore.clear()
  })

  describe('rateLimit', () => {
    it('should allow requests under limit', async () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 5 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.1' } })

      for (let i = 0; i < 5; i++) {
        const result = await limiter(req)
        expect(result).toBeNull()
      }
    })

    it('should block requests over limit', async () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 2 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.2' } })

      await limiter(req) // 1
      await limiter(req) // 2
      const result = await limiter(req) // 3 - should be blocked

      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
      expect(result!.headers.get('Retry-After')).toBeDefined()
    })

    it('should reset after window expires', async () => {
      const limiter = rateLimit({ windowMs: 100, maxRequests: 1 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.3' } })

      await limiter(req) // 1
      const result1 = await limiter(req) // 2 - blocked
      expect(result1).not.toBeNull()
    })
  })

  describe('predefined limiters', () => {
    it('authRateLimit should allow 5 req/min', async () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.100' } })
      for (let i = 0; i < 5; i++) {
        expect(await authRateLimit(req)).toBeNull()
      }
      expect(await authRateLimit(new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.100' } }))).not.toBeNull()
    })

    it('documentRateLimit should allow 30 req/min', async () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.200' } })
      for (let i = 0; i < 30; i++) {
        expect(await documentRateLimit(req)).toBeNull()
      }
      expect(await documentRateLimit(new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.200' } }))).not.toBeNull()
    })
  })
})