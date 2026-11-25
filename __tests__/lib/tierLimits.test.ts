import { describe, it, expect, beforeEach, jest } from "@jest/globals"

jest.mock("@/lib/supabase", () => ({
  getPooledRouteClient: jest.fn(),
}))

jest.mock("@/lib/cache", () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDel: jest.fn().mockResolvedValue(undefined),
}))

import { getTierLimits, checkTierLimit, trackUsage, hasFeatureForUser } from "@/lib/tierLimits"

const mockGetRouteClient = jest.requireMock("@/lib/supabase").getPooledRouteClient

describe("Tier Limits", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("returns default limits when DB tier_limits table is unavailable", async () => {
    mockGetRouteClient.mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const limits = await getTierLimits("user-123")
    expect(limits.documents_per_month).toBe(500)
    expect(limits.conversions_per_month).toBe(100)
    expect(limits.storage_gb).toBe(5)
  })

  it("returns DB limits when available", async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { tier: "professional" },
        error: null,
      }),
    }

    const mockTierLimitsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          tier: "professional",
          documents_per_month: -1,
          conversions_per_month: -1,
          storage_gb: 100,
          max_file_size_mb: 50,
          api_requests_per_minute: 100,
          has_priority_support: true,
          has_audit_logs: true,
          has_advanced_templates: true,
        },
        error: null,
      }),
    }

    mockGetRouteClient.mockReturnValue({
      from: jest.fn((table: string) => {
        if (table === "subscriptions") return mockChain
        if (table === "tier_limits") return mockTierLimitsChain
        return mockChain
      }),
    })

    const limits = await getTierLimits("user-123")
    expect(limits.tier).toBeUndefined()
    expect(limits.storage_gb).toBe(100)
    expect(limits.has_priority_support).toBe(true)
  })

  it("checkTierLimit returns allowed for unlimited tier", async () => {
    const usageChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockResolvedValue({ data: null, count: 0, error: null }),
    }
    const subChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { tier: "professional" }, error: null }),
    }
    const tierLimitsChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          tier: "professional",
          documents_per_month: -1,
          conversions_per_month: -1,
          storage_gb: 100,
          max_file_size_mb: 50,
          api_requests_per_minute: 100,
          has_priority_support: true,
          has_audit_logs: true,
          has_advanced_templates: true,
        },
        error: null,
      }),
    }
    mockGetRouteClient.mockImplementation(() => ({
      from: jest.fn((table: string) => {
        if (table === "subscriptions") return subChain
        if (table === "tier_limits") return tierLimitsChain
        if (table === "usage_records") return usageChain
        return subChain
      }),
    }))

    const result = await checkTierLimit("user-123", "documents_created", 1)
    expect(result.allowed).toBe(true)
  })

  it("trackUsage inserts a usage record", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockGetRouteClient.mockReturnValue({
      from: () => ({
        insert: mockInsert,
      }),
    })

    await trackUsage("user-123", "conversions", 1)
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: "user-123",
      metric: "conversions",
      quantity: 1,
    })
  })

  it("hasFeatureForUser returns boolean", async () => {
    mockGetRouteClient.mockReturnValue({
      from: () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    const result = await hasFeatureForUser("user-123", "has_advanced_templates")
    expect(typeof result).toBe("boolean")
  })
})
