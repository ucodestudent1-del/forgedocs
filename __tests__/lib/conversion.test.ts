import {
  FORMAT_REGISTRY,
  getFormat,
  getSupportedTargets,
  getAllConversionPairs,
  getUnitCategories,
  getUnitPairs,
  isPairSupported,
  convertUnit,
  transformMetadata,
  type ConversionFormat,
} from "@/lib/conversion"

describe("Conversion Format Registry", () => {
  describe("getFormat", () => {
    it("should return a format by id", () => {
      const format = getFormat("pdf")
      expect(format).toBeDefined()
      expect(format.id).toBe("pdf")
      expect(format.name).toBe("PDF Document")
    })

    it("should return undefined for unknown id", () => {
      expect(getFormat("unknown_format")).toBeUndefined()
    })

    it("should return all expected categories", () => {
      const categories = new Set(Object.values(FORMAT_REGISTRY).map((f) => f.category))
      expect(categories).toContain("document")
      expect(categories).toContain("spreadsheet")
      expect(categories).toContain("presentation")
      expect(categories).toContain("image")
      expect(categories).toContain("text")
      expect(categories).toContain("unit")
      expect(categories).toContain("metadata")
    })
  })

  describe("format completeness", () => {
    const expectedFormats = [
      "pdf", "docx", "doc", "rtf", "odt", "txt", "md", "html", "epub",
      "xlsx", "xls", "csv", "ods", "tsv",
      "pptx", "ppt", "odp",
      "jpg", "jpeg", "png", "gif", "bmp", "tiff", "webp", "svg",
      "json", "xml", "yaml", "csv_meta",
    ]

    expectedFormats.forEach((id) => {
      it(`should have format ${id}`, () => {
        const format = getFormat(id)
        expect(format).toBeDefined()
        expect(format.mimeType).toBeDefined()
        expect(format.extension).toBeDefined()
      })
    })
  })
})

describe("Conversion Pairs", () => {
  describe("getSupportedTargets", () => {
    it("should return supported targets for docx", () => {
      const targets = getSupportedTargets("docx")
      expect(targets).toContain("pdf")
      expect(targets).toContain("txt")
      expect(targets).toContain("html")
    })

    it("should return supported targets for pdf", () => {
      const targets = getSupportedTargets("pdf")
      expect(targets).toContain("docx")
      expect(targets).toContain("txt")
      expect(targets).toContain("html")
    })

    it("should return supported targets for image sources", () => {
      const targets = getSupportedTargets("svg")
      expect(targets).toContain("png")
      expect(targets).toContain("jpg")
    })
  })

  describe("isPairSupported", () => {
    it("should return true for supported pairs", () => {
      expect(isPairSupported("docx", "pdf")).toBe(true)
      expect(isPairSupported("xlsx", "csv")).toBe(true)
      expect(isPairSupported("pptx", "pdf")).toBe(true)
    })

    it("should return false for unsupported pairs", () => {
      expect(isPairSupported("svg", "pdf")).toBe(false)
      expect(isPairSupported("jpg", "xlsx")).toBe(false)
    })
  })

  describe("getAllConversionPairs", () => {
    it("should return all conversion pairs", () => {
      const pairs = getAllConversionPairs()
      expect(Array.isArray(pairs)).toBe(true)
      expect(pairs.length).toBeGreaterThan(0)
    })

    it("each pair should have source, target, and supported", () => {
      getAllConversionPairs().forEach((pair) => {
        expect(pair).toHaveProperty("source")
        expect(pair).toHaveProperty("target")
        expect(pair).toHaveProperty("supported")
      })
    })
  })
})

describe("Unit Conversions", () => {
  describe("getUnitCategories", () => {
    it("should return unit categories", () => {
      const categories = getUnitCategories()
      expect(categories).toContain("length")
      expect(categories).toContain("mass")
      expect(categories).toContain("temperature")
      expect(categories).toContain("volume")
      expect(categories).toContain("area")
    })
  })

  describe("getUnitPairs", () => {
    it("should return pairs for length category", () => {
      const pairs = getUnitPairs("length")
      expect(pairs.length).toBeGreaterThan(0)
      expect(pairs[0]).toHaveProperty("from")
      expect(pairs[0]).toHaveProperty("to")
    })

    it("should return empty array for unknown category", () => {
      expect(getUnitPairs("unknown")).toEqual([])
    })
  })

  describe("convertUnit", () => {
    it("should convert meters to kilometers", () => {
      const result = convertUnit(1000, "length", "m", "km")
      expect(result).toBe(1)
    })

    it("should convert celsius to fahrenheit", () => {
      const result = convertUnit(0, "temperature", "c", "f")
      expect(result).toBe(32)
    })

    it("should convert kilograms to pounds", () => {
      const result = convertUnit(1, "mass", "kg", "lb")
      expect(result).toBeCloseTo(2.20462, 4)
    })

    it("should convert liters to gallons", () => {
      const result = convertUnit(1, "volume", "l", "gal")
      expect(result).toBeCloseTo(0.264172, 5)
    })

    it("should convert bytes to kilobytes", () => {
      const result = convertUnit(1024, "data-size", "b", "kb")
      expect(result).toBe(1)
    })

    it("should throw for unknown category", () => {
      expect(() => convertUnit(1, "unknown", "a", "b")).toThrow()
    })

    it("should throw for unsupported unit pair", () => {
      expect(() => convertUnit(1, "length", "m", "unknown_unit")).toThrow()
    })
  })
})

describe("Metadata Transformation", () => {
  const sampleData = {
    title: "Test Document",
    author: "Jane Doe",
    version: 2,
    tags: ["contract", "legal"],
    nested: {
      created: "2024-01-01",
      modified: "2024-01-02",
    },
  }

  describe("transformMetadata to JSON", () => {
    it("should transform to JSON", () => {
      const result = transformMetadata({
        sourceFormat: "json",
        targetFormat: "json",
        data: sampleData,
      })
      const parsed = JSON.parse(result)
      expect(parsed.title).toBe("Test Document")
      expect(parsed.author).toBe("Jane Doe")
    })
  })

  describe("transformMetadata to YAML", () => {
    it("should transform to YAML", () => {
      const result = transformMetadata({
        sourceFormat: "json",
        targetFormat: "yaml",
        data: sampleData,
      })
      expect(result).toContain("title: Test Document")
      expect(result).toContain("author: Jane Doe")
    })
  })

  describe("transformMetadata to XML", () => {
    it("should transform to XML", () => {
      const result = transformMetadata({
        sourceFormat: "json",
        targetFormat: "xml",
        data: sampleData,
      })
      expect(result).toContain("<?xml")
      expect(result).toContain("<title>Test Document</title>")
    })
  })

  describe("transformMetadata to CSV", () => {
    it("should transform to CSV", () => {
      const result = transformMetadata({
        sourceFormat: "json",
        targetFormat: "csv_meta",
        data: { name: "Test", value: "123" },
      })
      expect(result).toContain("name")
      expect(result).toContain("Test")
    })
  })

  describe("flatten option", () => {
    it("should flatten nested objects when enabled", () => {
      const result = transformMetadata({
        sourceFormat: "json",
        targetFormat: "json",
        data: sampleData,
        options: { flatten: true },
      })
      const parsed = JSON.parse(result)
      expect(parsed["nested.created"]).toBe("2024-01-01")
      expect(parsed["nested.modified"]).toBe("2024-01-02")
    })
  })

  it("should throw for unsupported target format", () => {
    expect(() =>
      transformMetadata({
        sourceFormat: "json",
        targetFormat: "pdf" as any,
        data: sampleData,
      })
    ).toThrow()
  })
})
