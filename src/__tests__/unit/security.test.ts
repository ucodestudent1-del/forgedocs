import { describe, it, expect } from "@jest/globals"

describe("Security utilities", () => {
  it("rate limiter should allow requests within limit", () => {
    const { createRateLimiter } = require("../../src/lib/security")
    const limiter = createRateLimiter(3, 60000)

    const r1 = limiter("user1")
    const r2 = limiter("user1")
    const r3 = limiter("user1")
    const r4 = limiter("user1")

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
    expect(r4.allowed).toBe(false)
  })

  it("rate limiter should reset after window", () => {
    const { createRateLimiter } = require("../../src/lib/security")
    const limiter = createRateLimiter(1, 10) // 10ms window

    const r1 = limiter("user1")
    expect(r1.allowed).toBe(true)

    const r2 = limiter("user1")
    expect(r2.allowed).toBe(false)

    // Wait for window to reset
    return new Promise((resolve) => {
      setTimeout(() => {
        const r3 = limiter("user1")
        expect(r3.allowed).toBe(true)
        resolve(true)
      }, 20)
    })
  })

  it("should validate file types", () => {
    const { validateFileType } = require("../../src/lib/security")

    expect(validateFileType("document.pdf", ["application/pdf"])).toBe(true)
    expect(validateFileType("document.docx", ["application/pdf"])).toBe(false)
    expect(validateFileType("spreadsheet.xlsx", ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"])).toBe(true)
  })

  it("should sanitize filenames", () => {
    const { sanitizeFilename } = require("../../src/lib/security")

    expect(sanitizeFilename("my document!.pdf")).toBe("my_document_.pdf")
    expect(sanitizeFilename("normal_file.pdf")).toBe("normal_file.pdf")
  })
})
