import React from 'react'
import '@testing-library/jest-dom'

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.STRIPE_SECRET_KEY = 'sk_test_123'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.NODE_ENV = 'test'
process.env.SENTRY_ORG = 'test-org'
process.env.SENTRY_PROJECT = 'test-project'

// Mock Next.js modules
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => React.createElement('img', { src, alt, ...props }),
}))

jest.mock('next/link', ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
  React.createElement('a', { href, ...props }, children)
))

// Mock Supabase SSR
const createMockClient = () => ({
  auth: {
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
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
})

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(createMockClient),
  createRouteClient: jest.fn(createMockClient),
  createBrowserClient: jest.fn(createMockClient),
}))

// Mock Supabase JS
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    ...createMockClient(),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.com/file' } })),
        createSignedUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
      })),
    },
  })),
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getAll: jest.fn(() => []),
  }),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  revalidateTag: jest.fn(),
}))

// Mock crypto
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock Request for Jest environment
global.Request = class MockRequest {
  url: string
  headers: Map<string, string>
  
  constructor(url: string, options: { headers?: Record<string, string> } = {}) {
    this.url = url
    this.headers = new Map(Object.entries(options.headers || {}))
  }
  
  get(name: string): string | null {
    return this.headers.get(name.toLowerCase()) || null
  }
} as any

// Suppress console.error in tests unless explicitly testing errors
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    if (args[0]?.includes?.('act(...)')) return
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Global test timeout
jest.setTimeout(10000)