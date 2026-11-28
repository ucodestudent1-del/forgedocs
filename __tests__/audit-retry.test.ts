import { logAuditEvent, flushAuditRetryQueue, enqueueAuditRetry } from "@/lib/audit"
import { createRouteAuthClient } from "@/lib/supabase"

jest.mock("@/lib/supabase")
jest.mock("@/lib/logger", () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
  logAuditEvent: jest.fn(),
}))

describe("Audit Log Retry Queue", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset the module to clear the queue
    jest.resetModules()
  })

  it("enqueues failed audit events for retry", async () => {
    const { createRouteAuthClient } = require("@/lib/supabase")
    createRouteAuthClient.mockResolvedValue({
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error("DB down")),
    })

    await logAuditEvent({
      userId: "user-1",
      action: "test.action",
      severity: "low",
    })

    // Should have enqueued for retry
    const { auditRetryQueue } = require("@/lib/audit")
    expect(auditRetryQueue.length).toBeGreaterThan(0)
  })

  it("flushes retry queue on recovery", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    const { createRouteAuthClient } = require("@/lib/supabase")
    createRouteAuthClient.mockResolvedValue({
      from: jest.fn().mockReturnThis(),
      insert: mockInsert,
    })

    // Add some items to the queue
    await enqueueAuditRetry({
      userId: "user-1",
      action: "queued.action",
      severity: "low",
    })
    await enqueueAuditRetry({
      userId: "user-2",
      action: "queued.action.2",
      severity: "medium",
    })

    await flushAuditRetryQueue()

    expect(mockInsert).toHaveBeenCalledTimes(2)
  })

  it("re-queues items that still fail", async () => {
    const { createRouteAuthClient } = require("@/lib/supabase")
    createRouteAuthClient.mockResolvedValue({
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockRejectedValue(new Error("Still down")),
    })

    await enqueueAuditRetry({
      userId: "user-1",
      action: "persistent.fail",
      severity: "high",
    })

    await flushAuditRetryQueue()

    // Should still be in queue
    const { auditRetryQueue } = require("@/lib/audit")
    expect(auditRetryQueue.length).toBeGreaterThan(0)
  })

  it("handles queue overflow with O(1) drop oldest", async () => {
    const { AUDIT_MAX_RETRY_QUEUE, auditRetryQueue, enqueueAuditRetry: internalEnqueue } = require("@/lib/audit")
    
    // Fill queue beyond capacity
    for (let i = 0; i < AUDIT_MAX_RETRY_QUEUE + 10; i++) {
      await internalEnqueue({
        userId: `user-${i}`,
        action: `action-${i}`,
        severity: "low",
      })
    }

    expect(auditRetryQueue.length).toBeLessThanOrEqual(AUDIT_MAX_RETRY_QUEUE)
  })

  it("compacts queue when head threshold exceeded", async () => {
    const { auditRetryQueue, QUEUE_COMPACT_THRESHOLD, enqueueAuditRetry: internalEnqueue } = require("@/lib/audit")
    
    // Add items
    for (let i = 0; i < QUEUE_COMPACT_THRESHOLD + 5; i++) {
      await internalEnqueue({
        userId: `user-${i}`,
        action: `action-${i}`,
        severity: "low",
      })
    }
    
    // Remove some from head
    for (let i = 0; i < QUEUE_COMPACT_THRESHOLD + 2; i++) {
      auditRetryQueue.shift()
    }
    
    // Add one more to trigger compaction
    await internalEnqueue({
      userId: "user-new",
      action: "action-new",
      severity: "low",
    })
    
    // Queue should be compacted
    expect(auditRetryQueue[0]).not.toBeUndefined()
  })
})