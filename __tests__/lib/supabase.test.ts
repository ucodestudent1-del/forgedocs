import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { getRouteClient } from '@/lib/supabase'

// Mock Supabase client
jest.mock('@/lib/supabase', () => ({
  getRouteClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null })
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    }))
  }))
)

describe('Supabase Client', () => {
  it('should create client successfully', () => {
    const client = getRouteClient()
    expect(client).toBeDefined()
    expect(typeof client.auth.getUser).toBe('function')
    expect(typeof client.from).toBe('function')
  })
})