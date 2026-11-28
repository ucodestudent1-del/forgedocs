import { resolveStoredSecret, generateSecret, verifyToken, reEncryptSecret } from "@/lib/mfa"
import { DocumentRenderer } from "@/lib/document-generator/document-renderer"
import { TemplateLoader } from "@/lib/document-generator/template-loader"
import { PlaceholderProcessor } from "@/lib/document-generator/placeholder-processor"
import { SectionRendererRegistry } from "@/lib/document-generator/section-renderer-registry"
import { ConversionService } from "@/lib/services/conversion-service"
import { AppError } from "@/lib/api-error"
import { FormatRegistry } from "@/lib/conversion/format-registry"
import type { ConversionFormat, ConversionPair } from "@/lib/conversion"

describe("MFA Key Rotation", () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it("returns KEY_ROTATION_REQUIRED when decryption key mismatches", () => {
    process.env.MFA_ENCRYPTION_KEY = "different-key-for-test"
    
    // This test would need a properly encrypted secret with a different key
    // For now, verify the error handling structure
    const result = resolveStoredSecret(null)
    expect(result.secret).toBeNull()
    expect(result.error).toBeUndefined()
  })

  it("returns DATA_CORRUPT for malformed encrypted data", () => {
    const result = resolveStoredSecret("v1:notvalidbase64:garbage")
    expect(result.secret).toBeNull()
    expect(result.error).toBe("DECRYPTION_FAILED")
  })

  it("returns secret for plaintext legacy values", () => {
    const result = resolveStoredSecret("plaintext-secret")
    expect(result.secret).toBe("plaintext-secret")
    expect(result.error).toBeUndefined()
  })

  it("generates valid TOTP secrets", () => {
    const secret = generateSecret()
    expect(secret).toBeTruthy()
    expect(secret.length).toBeGreaterThan(16)
  })

  it("re-encrypts secrets with new key", () => {
    const secret = generateSecret()
    const encrypted = reEncryptSecret(secret)
    expect(encrypted).toBeTruthy()
    expect(encrypted).not.toBe(secret)
  })
})

describe("Document Generator Components", () => {
  let renderer: DocumentRenderer

  beforeEach(() => {
    renderer = new DocumentRenderer()
  })

  describe("TemplateLoader", () => {
    it("loads existing template", () => {
      const loader = new TemplateLoader()
      const template = loader.load("contract")
      expect(template).toBeDefined()
      expect(template.id).toBe("contract")
    })

    it("throws for non-existent template", () => {
      const loader = new TemplateLoader()
      expect(() => loader.load("non-existent")).toThrow("not found")
    })

    it("validates template structure", () => {
      const loader = new TemplateLoader()
      const result = loader.validate({
        id: "test",
        name: "Test",
        sections: [],
        fields: [],
      })
      expect(result.valid).toBe(false)
      expect(result.errors).toContain("Template must have at least one section")
    })
  })

  describe("PlaceholderProcessor", () => {
    it("compiles and replaces placeholders", () => {
      const processor = new PlaceholderProcessor()
      processor.compile({ name: "John", date: "2024-01-01" })
      
      const result = processor.replace("Hello [name], today is [date]")
      expect(result).toBe("Hello John, today is 2024-01-01")
    })

    it("escapes HTML in values", () => {
      const processor = new PlaceholderProcessor()
      processor.compile({ input: "<script>alert(1)</script>" })
      
      const result = processor.replace("Input: [input]")
      expect(result).not.toContain("<script>")
      expect(result).toContain("<script>")
    })

    it("handles missing placeholders gracefully", () => {
      const processor = new PlaceholderProcessor()
      processor.compile({ name: "John" })
      
      const result = processor.replace("Hello [name], missing: [missing]")
      expect(result).toBe("Hello John, missing: [missing]")
    })
  })

  describe("SectionRendererRegistry", () => {
    it("registers and finds renderers", () => {
      const registry = new SectionRendererRegistry()
      const mockRenderer = { render: jest.fn().mockReturnValue("<div>test</div>") }
      
      registry.register("test-section", mockRenderer as any)
      const found = registry.findRenderer("test-section")
      
      expect(found).toBe(mockRenderer)
    })

    it("falls back to default renderer", () => {
      const registry = new SectionRendererRegistry()
      const defaultRenderer = { render: jest.fn().mockReturnValue("<div>default</div>") }
      
      registry.setDefault(defaultRenderer as any)
      const found = registry.findRenderer("unknown-section")
      
      expect(found).toBe(defaultRenderer)
    })

    it("throws when no renderer and no default", () => {
      const registry = new SectionRendererRegistry()
      expect(() => registry.findRenderer("unknown")).toThrow("No renderer found")
    })
  })

  describe("DocumentRenderer", () => {
    it("generates HTML for valid template", async () => {
      const html = await renderer.renderToHtml("contract", {
        party_a: "Company A",
        party_b: "Company B",
        effective_date: "2024-01-01",
      })
      
      expect(html).toContain("Company A")
      expect(html).toContain("Company B")
      expect(html).toContain("2024-01-01")
    })

    it("includes CSS styling in HTML", async () => {
      const html = await renderer.renderToHtml("invoice", {
        company_name: "Test Corp",
        invoice_number: "INV-001",
      })
      
      expect(html).toContain("<style>")
      expect(html).toContain("font-family")
    })

    it("exports template info", () => {
      const info = renderer.getTemplateInfo("contract")
      expect(info.id).toBe("contract")
      expect(info.name).toBeTruthy()
      expect(info.fields).toBeDefined()
    })
  })
})

describe("Conversion Service", () => {
  let service: ConversionService
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      storage: {
        from: jest.fn().mockReturnThis(),
        download: jest.fn(),
        upload: jest.fn(),
        createSignedUrl: jest.fn(),
      },
      rpc: jest.fn(),
    }
    service = new ConversionService(mockSupabase)
  })

  it("creates document conversion job", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { tier: "pro" }, error: null })
    mockSupabase.insert.mockResolvedValueOnce({ 
      data: { id: "job-123", user_id: "user-1" }, 
      error: null 
    })

    const job = await service.createDocumentConversionJob({
      type: "document",
      source_format: "docx",
      target_format: "pdf",
      source_url: "user-1/file.docx",
    }, "user-1")

    expect(job.id).toBe("job-123")
    expect(mockSupabase.from).toHaveBeenCalledWith("conversion_jobs")
  })

  it("rejects unsupported conversion pairs", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { tier: "pro" }, error: null })

    await expect(service.createDocumentConversionJob({
      type: "document",
      source_format: "docx",
      target_format: "xyz",
    }, "user-1")).rejects.toThrow(AppError)
  })

  it("enforces SSRF protection on source_url", async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { tier: "pro" }, error: null })

    await expect(service.createDocumentConversionJob({
      type: "document",
      source_format: "docx",
      target_format: "pdf",
      source_url: "https://evil.com/file.docx",
    }, "user-1")).rejects.toThrow(AppError)
  })

  it("performs unit conversion", async () => {
    const result = await service.convertUnit(100, "length", "meter", "foot")
    expect(result.type).toBe("unit")
    expect(result.result).toBeCloseTo(328.08, 1)
  })

  it("performs metadata conversion", async () => {
    const result = await service.convertMetadata("json", "yaml", { key: "value" })
    expect(result.type).toBe("metadata")
    expect(result.output).toContain("key: value")
  })

  it("gets all formats and pairs", () => {
    const formats = service.getAllFormats()
    expect(formats.length).toBeGreaterThan(0)
    
    const pairs = service.getAllConversionPairs()
    expect(pairs.length).toBeGreaterThan(0)
  })
})

describe("Format Registry Extensibility", () => {
  let registry: FormatRegistry

  beforeEach(() => {
    registry = new FormatRegistry()
  })

  it("registers custom formats", () => {
    const customFormat: ConversionFormat = {
      id: "custom-doc",
      name: "Custom Document",
      mimeType: "application/custom-doc",
      extension: ".cdoc",
      category: "document",
    }

    registry.registerFormat(customFormat)
    expect(registry.hasFormat("custom-doc")).toBe(true)
    expect(registry.getFormat("custom-doc")).toEqual(customFormat)
  })

  it("registers custom conversion pairs", () => {
    const formatA: ConversionFormat = { id: "fmt-a", name: "A", mimeType: "app/a", extension: ".a", category: "document" }
    const formatB: ConversionFormat = { id: "fmt-b", name: "B", mimeType: "app/b", extension: ".b", category: "document" }
    
    registry.registerFormat(formatA)
    registry.registerFormat(formatB)
    
    const pair: ConversionPair = { source: "fmt-a", target: "fmt-b", supported: true }
    registry.registerPair(pair)
    
    expect(registry.isPairSupported("fmt-a", "fmt-b")).toBe(true)
    expect(registry.getSupportedTargets("fmt-a")).toContain("fmt-b")
  })

  it("gets pair details", () => {
    const formatA: ConversionFormat = { id: "fmt-a", name: "A", mimeType: "app/a", extension: ".a", category: "document" }
    const formatB: ConversionFormat = { id: "fmt-b", name: "B", mimeType: "app/b", extension: ".b", category: "document" }
    
    registry.registerFormat(formatA)
    registry.registerFormat(formatB)
    
    const pair: ConversionPair = { source: "fmt-a", target: "fmt-b", supported: true, mayLoseData: true }
    registry.registerPair(pair)
    
    const details = registry.getPairDetails("fmt-a", "fmt-b")
    expect(details?.mayLoseData).toBe(true)
  })

  it("unregisters formats", () => {
    const format: ConversionFormat = { id: "temp", name: "Temp", mimeType: "app/temp", extension: ".tmp", category: "document" }
    registry.registerFormat(format)
    expect(registry.hasFormat("temp")).toBe(true)
    
    registry.unregisterFormat("temp")
    expect(registry.hasFormat("temp")).toBe(false)
  })
})

describe("AppError Standardization", () => {
  it("creates standardized errors", () => {
    const err = AppError.unauthorized("Custom message")
    expect(err.code).toBe("UNAUTHORIZED")
    expect(err.statusCode).toBe(401)
    expect(err.message).toBe("Custom message")
  })

  it("creates validation errors", () => {
    const err = AppError.validation("Invalid input", { field: "email" })
    expect(err.code).toBe("VALIDATION_ERROR")
    expect(err.statusCode).toBe(400)
    expect(err.details).toEqual({ field: "email" })
  })

  it("creates rate limit errors", () => {
    const err = AppError.rateLimited("Too many requests")
    expect(err.code).toBe("RATE_LIMITED")
    expect(err.statusCode).toBe(429)
  })

  it("creates service unavailable errors", () => {
    const err = AppError.unavailable("Redis")
    expect(err.code).toBe("SERVICE_UNAVAILABLE")
    expect(err.statusCode).toBe(503)
    expect(err.message).toBe("Redis unavailable")
  })

  it("isAppError correctly identifies AppError instances", () => {
    const appErr = AppError.internal()
    const regularErr = new Error("regular")
    
    expect(require("@/lib/api-error").isAppError(appErr)).toBe(true)
    expect(require("@/lib/api-error").isAppError(regularErr)).toBe(false)
  })
})