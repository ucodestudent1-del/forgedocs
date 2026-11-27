import { getPooledRouteClient, createRouteAuthClient } from '@/lib/supabase'

jest.mock('@/lib/supabase', () => ({
  getRouteClient: jest.fn(),
  getPooledRouteClient: jest.fn(),
  createRouteAuthClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn(),
}

;(createRouteAuthClient as jest.Mock).mockResolvedValue(mockSupabase)

function chain(rows: any[] | null, error: any = null) {
  const base: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: rows ? rows[0] : null, error }),
  }
  return base
}

describe('Account Authorization', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getUserAccounts', () => {
    const { getUserAccounts } = require('@/lib/account-authz')

    it('returns accounts the user is a member of', async () => {
      const accounts = [
        { id: 'acc-1', name: 'Acme', slug: 'acme', plan: 'pro', status: 'active', owner_id: 'u-1', role: 'admin' },
        { id: 'acc-2', name: 'Globex', slug: 'globex', plan: 'free', status: 'active', owner_id: 'u-2', role: 'member' },
      ]
      const selectMock = jest.fn().mockReturnThis()
      const eqMock = jest.fn().mockResolvedValue({ data: accounts.map((a) => ({ role: a.role, accounts: a })), error: null })
      mockSupabase.from.mockReturnValue({ select: selectMock.mockReturnValue({ eq: eqMock }) })

      const result = await getUserAccounts('u-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('account_members')
      expect(result).toHaveLength(2)
      expect(result[0].role).toBe('admin')
    })

    it('returns empty array when user has no memberships', async () => {
      const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqMock }) })

      const result = await getUserAccounts('u-99')
      expect(result).toEqual([])
    })
  })

  describe('getAccountMembership', () => {
    const { getAccountMembership } = require('@/lib/account-authz')

    it('returns membership when user belongs to account', async () => {
      const row = { role: 'owner', accounts: { id: 'acc-1', name: 'Acme', slug: 'acme', plan: 'pro', status: 'active', owner_id: 'u-1' } }
      mockSupabase.from.mockReturnValue(chain([row], null))

      const result = await getAccountMembership('u-1', 'acc-1')

      expect(result).not.toBeNull()
      expect(result!.role).toBe('owner')
      expect(result!.account.id).toBe('acc-1')
    })

    it('returns null when user is not a member', async () => {
      mockSupabase.from.mockReturnValue(chain(null, { code: 'PGRST116' }))

      const result = await getAccountMembership('u-99', 'acc-1')
      expect(result).toBeNull()
    })
  })

  describe('hasRole', () => {
    const { hasRole } = require('@/lib/account-authz')

    it('grants access when role meets requirement', () => {
      expect(hasRole('admin', 'member')).toBe(true)
      expect(hasRole('owner', 'admin')).toBe(true)
    })

    it('denies access when role is below requirement', () => {
      expect(hasRole('member', 'admin')).toBe(false)
      expect(hasRole('viewer', 'member')).toBe(false)
    })
  })

  describe('requireAccountMembership', () => {
    const { requireAccountMembership } = require('@/lib/account-authz')

    it('returns account when membership sufficient', async () => {
      const row = { role: 'admin', accounts: { id: 'acc-1', name: 'Acme', slug: 'acme', plan: 'pro', status: 'active', owner_id: 'u-1' } }
      mockSupabase.from.mockReturnValue(chain([row], null))

      const account = await requireAccountMembership('u-1', 'acc-1', 'member')
      expect(account.id).toBe('acc-1')
    })

    it('throws 403 when not a member', async () => {
      mockSupabase.from.mockReturnValue(chain(null, { code: 'PGRST116' }))

      await expect(requireAccountMembership('u-99', 'acc-1')).rejects.toMatchObject({
        statusCode: 403,
        code: 'ACCOUNT_NOT_FOUND',
      })
    })

    it('throws 403 when role insufficient', async () => {
      const row = { role: 'viewer', accounts: { id: 'acc-1', name: 'Acme', slug: 'acme', plan: 'free', status: 'active', owner_id: 'u-1' } }
      mockSupabase.from.mockReturnValue(chain([row], null))

      await expect(requireAccountMembership('u-1', 'acc-1', 'admin')).rejects.toMatchObject({
        statusCode: 403,
        code: 'INSUFFICIENT_ROLE',
      })
    })
  })

  describe('validateResourceAccountAccess', () => {
    const { validateResourceAccountAccess } = require('@/lib/account-authz')

    it('allows personal resources (no account)', async () => {
      const result = await validateResourceAccountAccess(null, 'u-1')
      expect(result).toBe(true)
    })

    it('allows when user is a member of the account', async () => {
      const accounts = [{ id: 'acc-1', name: 'Acme', slug: 'acme', plan: 'free', status: 'active', owner_id: 'u-1', role: 'member' }]
      const eqMock = jest.fn().mockResolvedValue({ data: accounts.map((a) => ({ role: a.role, accounts: a })), error: null })
      mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqMock }) })

      const result = await validateResourceAccountAccess('acc-1', 'u-1')
      expect(result).toBe(true)
    })

    it('denies when user is not a member of the account', async () => {
      const eqMock = jest.fn().mockResolvedValue({ data: [], error: null })
      mockSupabase.from.mockReturnValue({ select: jest.fn().mockReturnValue({ eq: eqMock }) })

      const result = await validateResourceAccountAccess('acc-1', 'u-99')
      expect(result).toBe(false)
    })
  })
})
