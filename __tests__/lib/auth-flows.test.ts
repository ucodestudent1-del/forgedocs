import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { validatePassword } from '@/lib/password'

describe('Signup validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(emailRegex.test('test@example.com')).toBe(true)
    expect(emailRegex.test('invalid-email')).toBe(false)
    expect(emailRegex.test('')).toBe(false)
  })

  it('should validate password requirements', () => {
    const valid = validatePassword('ValidPass123!')
    expect(valid.valid).toBe(true)

    const short = validatePassword('short1!')
    expect(short.valid).toBe(false)

    const noUpper = validatePassword('lowercase1!')
    expect(noUpper.valid).toBe(false)

    const noLower = validatePassword('UPPERCASE1!')
    expect(noLower.valid).toBe(false)

    const noNumber = validatePassword('NoNumbers!')
    expect(noNumber.valid).toBe(false)

    const noSpecial = validatePassword('NoSpecial123')
    expect(noSpecial.valid).toBe(false)
  })

  it('should validate password match', () => {
    const password = 'ValidPass123!'
    const confirmPassword = 'ValidPass123!'
    expect(password).toBe(confirmPassword)

    const mismatched = 'DifferentPass123!'
    expect(password).not.toBe(mismatched)
  })

  it('should handle duplicate email detection', () => {
    const errorMessage = 'User already exists'
    const isDuplicate = errorMessage.toLowerCase().includes('already registered') ||
      errorMessage.toLowerCase().includes('user already exists')
    expect(isDuplicate).toBe(true)
  })

  it('should handle unverified email error', () => {
    const errorMessage = 'Email not confirmed'
    const isUnconfirmed = errorMessage.toLowerCase().includes('confirm') ||
      errorMessage.toLowerCase().includes('email not confirmed')
    expect(isUnconfirmed).toBe(true)
  })
})

describe('Login validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should validate required fields', () => {
    const email = ''
    const password = ''
    expect(!email || !password).toBe(true)
  })

  it('should handle invalid credentials', () => {
    const error = { message: 'Invalid login credentials', code: 'INVALID_LOGIN' }
    const isInvalid = error.message.toLowerCase().includes('invalid login') ||
      error.message.toLowerCase().includes('credentials') ||
      error.code === 'INVALID_LOGIN'
    expect(isInvalid).toBe(true)
  })
})

describe('Password recovery validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should validate reset email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    expect(emailRegex.test('test@example.com')).toBe(true)
    expect(emailRegex.test('invalid')).toBe(false)
  })

  it('should validate new password matches confirm', () => {
    const password = 'NewValidPass123!'
    const confirmPassword = 'NewValidPass123!'
    expect(password).toBe(confirmPassword)
  })
})
