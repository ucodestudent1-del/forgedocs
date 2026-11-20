import { describe, it, expect, beforeEach, jest } from "@jest/globals"

jest.mock("@/lib/supabase", () => ({
  getRouteClient: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: { warn: jest.fn(), info: jest.fn(), error: jest.fn() },
  logAuditEvent: jest.fn(),
}))

import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const mockGetRouteClient = jest.requireMock("@/lib/supabase").getRouteClient
const mockLogAuditEvent = jest.requireMock("@/lib/logger").logAuditEvent

describe("Audit Logging", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("logs to Winston and database", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
    mockGetRouteClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    })

    await logAuditEvent({
      userId: "user-123",
      action: "document.create",
      entityType: "documents",
      entityId: "doc-456",
      severity: "medium",
      details: { title: "Test Doc" },
    })

    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "document.create",
      "user-123",
      expect.objectContaining({ entity_type: "documents" }),
      "medium"
    )
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        action: "document.create",
        entity_type: "documents",
        severity: "medium",
      })
    )
  })

  it("does not break when DB write fails", async () => {
    const mockInsert = jest.fn().mockRejectedValue(new Error("DB down"))
    mockGetRouteClient.mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: mockInsert,
      }),
    })

    // Should not throw
    await expect(
      logAuditEvent({
        userId: "user-123",
        action: "test.action",
        severity: "low",
      })
    ).resolves.toBeUndefined()
  })

  it("getClientIp extracts from x-forwarded-for", () => {
    process.env.TRUSTED_PROXY_IPS = "10.0.0.1"
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" },
    })
    expect(getClientIp(req)).toBe("203.0.113.5")
    delete process.env.TRUSTED_PROXY_IPS
  })

  it("getClientIp falls back to x-real-ip", () => {
    process.env.TRUSTED_PROXY_IPS = "198.51.100.23"
    const req = new Request("http://localhost/", {
      headers: { "x-real-ip": "198.51.100.23" },
    })
    expect(getClientIp(req)).toBe("198.51.100.23")
    delete process.env.TRUSTED_PROXY_IPS
  })

  it("getClientUserAgent extracts user agent", () => {
    const req = new Request("http://localhost/", {
      headers: { "user-agent": "Mozilla/5.0 TestAgent" },
    })
    expect(getClientUserAgent(req)).toBe("Mozilla/5.0 TestAgent")
  })

  it("getClientUserAgent returns null when absent", () => {
    const req = new Request("http://localhost/")
    expect(getClientUserAgent(req)).toBeNull()
  })
})
