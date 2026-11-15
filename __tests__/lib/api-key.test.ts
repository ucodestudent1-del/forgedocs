import { describe, it, expect } from "@jest/globals"
import {
  generateApiKey,
  hashApiKey,
  compareApiKey,
  API_KEY_PREFIX,
} from "@/lib/api-key"

describe("API Key Generation", () => {
  it("generates a key with the correct prefix", () => {
    const { rawKey } = generateApiKey()
    expect(rawKey.startsWith(`${API_KEY_PREFIX}_`)).toBe(true)
  })

  it("generates a unique key each time", () => {
    const { rawKey: key1 } = generateApiKey()
    const { rawKey: key2 } = generateApiKey()
    expect(key1).not.toBe(key2)
  })

  it("produces a consistent hash for the same key", () => {
    const { rawKey } = generateApiKey()
    const hash1 = hashApiKey(rawKey)
    const hash2 = hashApiKey(rawKey)
    expect(hash1).toBe(hash2)
  })

  it("produces different hashes for different keys", () => {
    const { rawKey: key1 } = generateApiKey()
    const { rawKey: key2 } = generateApiKey()
    expect(hashApiKey(key1)).not.toBe(hashApiKey(key2))
  })

  it("compares a valid key to its hash", () => {
    const { rawKey } = generateApiKey()
    const hash = hashApiKey(rawKey)
    expect(compareApiKey(rawKey, hash)).toBe(true)
  })

  it("rejects an invalid key against a hash", () => {
    const { rawKey } = generateApiKey()
    const hash = hashApiKey(rawKey)
    expect(compareApiKey("sk_live_wrongkey123", hash)).toBe(false)
  })

  it("rejects keys with wrong prefix", () => {
    expect(compareApiKey("sk_test_wrong", hashApiKey("sk_live_right"))).toBe(false)
  })

  it("handles timing-safe comparison with different lengths", () => {
    expect(compareApiKey("short", "a-very-long-hash-string-that-is-definitely-longer")).toBe(false)
  })
})
