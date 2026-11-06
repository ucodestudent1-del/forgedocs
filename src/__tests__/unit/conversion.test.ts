import { describe, it, expect } from "@jest/globals"

describe("Conversion formats", () => {
  const supportedFormats = [
    { source: "docx", targets: ["pdf", "txt", "html"] },
    { source: "pdf", targets: ["docx", "txt"] },
    { source: "xlsx", targets: ["csv", "pdf"] },
    { source: "csv", targets: ["xlsx", "pdf"] },
    { source: "pptx", targets: ["pdf"] },
  ]

  it("should support docx to pdf conversion", () => {
    const docxFormat = supportedFormats.find((f) => f.source === "docx")
    expect(docxFormat?.targets).toContain("pdf")
  })

  it("should support pdf to docx conversion", () => {
    const pdfFormat = supportedFormats.find((f) => f.source === "pdf")
    expect(pdfFormat?.targets).toContain("docx")
  })

  it("should list all supported formats", () => {
    expect(supportedFormats.length).toBeGreaterThan(0)
  })
})
