import { createServiceRoleClient } from '@/lib/supabase'
import { WEBHOOK_HANDLERS } from '@/lib/billing/webhook-handlers'

const constructEventMock = jest.fn()

jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body: any, init: any = {}) => ({
      ...body,
      status: init.status || 200,
      headers: new Map(Object.entries(init?.headers || {})),
      json: async () => body,
    })),
  },
}))
jest.mock('@/lib/supabase', () => ({
  createServiceRoleClient: jest.fn(),
}))
jest.mock('@/lib/billing/webhook-handlers', () => ({
  WEBHOOK_HANDLERS: {},
}))
jest.mock('@/lib/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}))
jest.mock('stripe', () => ({
  __esModule: true,
  default: class Stripe {
    webhooks = { constructEvent: constructEventMock }
  },
}))

import { POST } from '@/app/api/billing/webhook/route'

const mockSupabase = {
  from: jest.fn(),
}

;(createServiceRoleClient as jest.Mock).mockResolvedValue(mockSupabase)

function singleResult(result: any) {
  const base = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  }
  return base
}

function insertMockFn() {
  const select = jest.fn().mockResolvedValue({ data: [{ id: 'wh-1' }], error: null })
  const insert = jest.fn().mockImplementation(() => ({ select }))
  return insert
}

function makeRequest(body: string, signature: string) {
  return {
    text: async () => body,
    headers: { get: (name: string) => (name === 'stripe-signature' ? signature : null) },
  } as any
}

describe('Billing webhook idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(WEBHOOK_HANDLERS as any) = {}
    constructEventMock.mockImplementation(() => ({
      id: 'evt_123',
      type: 'checkout.session.completed',
    }))
  })

  it('skips already-processed events without calling the handler', async () => {
    const handler = jest.fn().mockResolvedValue(undefined)
    ;(WEBHOOK_HANDLERS as any)['checkout.session.completed'] = handler

    mockSupabase.from.mockReturnValue(singleResult({ data: { event_id: 'stripe_evt_123', processed: true }, error: null }))

    const res = await POST(makeRequest('{}', 'sig'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.received).toBe(true)
    expect(handler).not.toHaveBeenCalled()
    expect(constructEventMock).toHaveBeenCalled()
  })

  it('records the event after a successful handler and returns 200', async () => {
    const handler = jest.fn().mockResolvedValue(undefined)
    ;(WEBHOOK_HANDLERS as any)['checkout.session.completed'] = handler

    const insertMock = insertMockFn()
    mockSupabase.from.mockImplementation((table: string) =>
      table === 'webhook_events'
        ? {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            insert: insertMock,
            update: jest.fn().mockReturnThis(),
          }
        : singleResult(null)
    )

    const res = await POST(makeRequest('{}', 'sig'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.received).toBe(true)
    expect(handler).toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalled()
  })

  it('returns 500 and does not mark the event processed when the handler fails', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('boom'))
    ;(WEBHOOK_HANDLERS as any)['checkout.session.completed'] = handler

    const insertMock = insertMockFn()
    const updateMock = jest.fn().mockReturnThis()
    mockSupabase.from.mockImplementation((table: string) =>
      table === 'webhook_events'
        ? {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            insert: insertMock,
            update: updateMock,
          }
        : singleResult(null)
    )

    const res = await POST(makeRequest('{}', 'sig'))

    expect(res.status).toBe(500)
    expect(handler).toHaveBeenCalled()
    // Event must NOT be marked processed so Stripe retries and the handler
    // re-runs (idempotently) instead of the billing event being silently lost.
    expect(updateMock).not.toHaveBeenCalled()
  })
})
