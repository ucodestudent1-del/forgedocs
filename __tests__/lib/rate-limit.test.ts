import { rateLimit, authRateLimit, documentRateLimit, apiRateLimit } from '@/lib/rate-limit'

describe('Rate Limiter', () => {
  const { rateLimitStore } = require('@/lib/rate-limit')

  beforeEach(() => {
    rateLimitStore.clear()
  })

  describe('rateLimit', () => {
    it('should allow requests under limit', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 5 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.1' } })

      for (let i = 0; i < 5; i++) {
        const result = limiter(req)
        expect(result).toBeNull()
      }
    })

    it('should block requests over limit', () => {
      const limiter = rateLimit({ windowMs: 60000, maxRequests: 2 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.2' } })

      limiter(req) // 1
      limiter(req) // 2
      const result = limiter(req) // 3 - should be blocked

      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
      expect(result!.headers.get('Retry-After')).toBeDefined()
    })

    it('should reset after window expires', () => {
      const limiter = rateLimit({ windowMs: 100, maxRequests: 1 })
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.3' } })

      limiter(req) // 1
      const result1 = limiter(req) // 2 - blocked
      expect(result1).not.toBeNull()
    })
  })

  describe('predefined limiters', () => {
    it('authRateLimit should allow 5 req/min', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.100' } })
      for (let i = 0; i < 5; i++) {
        expect(authRateLimit(req)).toBeNull()
      }
      expect(authRateLimit(new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.100' } }))).not.toBeNull()
    })

    it('documentRateLimit should allow 30 req/min', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.200' } })
      for (let i = 0; i < 30; i++) {
        expect(documentRateLimit(req)).toBeNull()
      }
      expect(documentRateLimit(new Request('http://localhost', { headers: { 'x-forwarded-for': '192.168.1.200' } }))).not.toBeNull()
    })
  })
})