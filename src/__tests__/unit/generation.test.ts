import { describe, it, expect } from "@jest/globals"

describe("Document generation", () => {
  it("should validate required placeholders", () => {
    const schema = [
      { name: "client_name", type: "text", required: true },
      { name: "amount", type: "number", required: true },
      { name: "notes", type: "text", required: false },
    ]

    const values = { client_name: "John", amount: 100 }

    const missing = schema.filter((f) => f.required && !(f.name in values))
    expect(missing.length).toBe(0)
  })

  it("should detect missing required fields", () => {
    const schema = [
      { name: "client_name", type: "text", required: true },
    ]
    const values = {}

    const missing = schema.filter((f) => f.required && !(f.name in values))
    expect(missing.length).toBe(1)
    expect(missing[0].name).toBe("client_name")
  })
})
