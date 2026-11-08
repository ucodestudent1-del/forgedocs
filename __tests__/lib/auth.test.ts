import { validatePassword, checkLoginAttempts, recordFailedAttempt, clearFailedAttempts, passwordSchema } from '@/lib/auth'

describe('Auth Utilities', () => {
  describe('validatePassword', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePassword('short1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters')
    })

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('lowercase1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
    })

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('UPPERCASE1!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one lowercase letter')
    })

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one number')
    })

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecial123')
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should accept valid passwords', () => {
      const result = validatePassword('ValidPass123!')
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })
  })

  describe('account lockout', () => {
    const testIp = '192.168.1.100'

    beforeEach(async () => {
      // Clear any existing attempts
      await clearFailedAttempts('192.168.1.1')
      await clearFailedAttempts('192.168.1.2')
      await clearFailedAttempts('192.168.1.3')
      await clearFailedAttempts('192.168.1.4')
    })

    it('should allow login when no failed attempts', async () => {
      const result = await checkLoginAttempts('192.168.1.1')
      expect(result.allowed).toBe(true)
    })

    it('should track failed attempts', async () => {
      await recordFailedAttempt('192.168.1.2')
      await recordFailedAttempt('192.168.1.2')
      
      const result = await checkLoginAttempts('192.168.1.2')
      expect(result.allowed).toBe(true)
    })

    it('should lock out after threshold', async () => {
      const ip = '192.168.1.3'
      for (let i = 0; i < 5; i++) {
        await recordFailedAttempt(ip)
      }
      
      const result = await checkLoginAttempts(ip)
      expect(result.allowed).toBe(false)
      expect(result.remainingMs).toBeGreaterThan(0)
    })

    it('should clear failed attempts on success', async () => {
      const ip = '192.168.1.4'
      await recordFailedAttempt(ip)
      await recordFailedAttempt(ip)
      
      await clearFailedAttempts(ip)
      const result = await checkLoginAttempts(ip)
      expect(result.allowed).toBe(true)
    })
  })
})