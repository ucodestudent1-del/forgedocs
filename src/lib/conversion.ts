import { z } from "zod"
import { FormatRegistry, formatRegistry } from './conversion/format-registry'
import Decimal from "decimal.js"

/* ============================================================================
   Conversion Types
   ============================================================================ */

export type ConversionType = "document" | "unit" | "metadata"

export interface ConversionFormat {
  id: string
  name: string
  mimeType: string
  extension: string
  category: "document" | "image" | "spreadsheet" | "presentation" | "text" | "unit" | "metadata"
}

export interface ConversionPair {
  source: string
  target: string
  supported: boolean
  requiresOcr?: boolean
  mayLoseData?: boolean
}

export interface ConversionOptions {
  ocr?: boolean
  quality?: number
  preserveMetadata?: boolean
  flatten?: boolean
  [key: string]: unknown
}

export interface ConversionJobInput {
  type: ConversionType
  sourceFormat: string
  targetFormat: string
  sourceValue: string | File | null
  sourceUrl?: string
  options?: ConversionOptions
}

/* ============================================================================
   Format Registry - Universal Format Support
   ============================================================================ */

// Initialize the registry with built-in formats
const BUILTIN_FORMATS: Record<string, ConversionFormat> = {
  // Documents
  pdf: { id: "pdf", name: "PDF Document", mimeType: "application/pdf", extension: ".pdf", category: "document" },
  docx: { id: "docx", name: "Word Document", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: ".docx", category: "document" },
  doc: { id: "doc", name: "Word 97-2003 Document", mimeType: "application/msword", extension: ".doc", category: "document" },
  rtf: { id: "rtf", name: "Rich Text Format", mimeType: "application/rtf", extension: ".rtf", category: "document" },
  odt: { id: "odt", name: "OpenDocument Text", mimeType: "application/vnd.oasis.opendocument.text", extension: ".odt", category: "document" },
  txt: { id: "txt", name: "Plain Text", mimeType: "text/plain", extension: ".txt", category: "text" },
  md: { id: "md", name: "Markdown", mimeType: "text/markdown", extension: ".md", category: "text" },
  html: { id: "html", name: "HTML Document", mimeType: "text/html", extension: ".html", category: "document" },
  epub: { id: "epub", name: "Electronic Publication", mimeType: "application/epub+zip", extension: ".epub", category: "document" },

  // Spreadsheets
  xlsx: { id: "xlsx", name: "Excel Workbook", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: ".xlsx", category: "spreadsheet" },
  xls: { id: "xls", name: "Excel 97-2003 Workbook", mimeType: "application/vnd.ms-excel", extension: ".xls", category: "spreadsheet" },
  csv: { id: "csv", name: "Comma Separated Values", mimeType: "text/csv", extension: ".csv", category: "spreadsheet" },
  ods: { id: "ods", name: "OpenDocument Spreadsheet", mimeType: "application/vnd.oasis.opendocument.spreadsheet", extension: ".ods", category: "spreadsheet" },
  tsv: { id: "tsv", name: "Tab Separated Values", mimeType: "text/tab-separated-values", extension: ".tsv", category: "spreadsheet" },

  // Presentations
  pptx: { id: "pptx", name: "PowerPoint Presentation", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: ".pptx", category: "presentation" },
  ppt: { id: "ppt", name: "PowerPoint 97-2003 Presentation", mimeType: "application/vnd.ms-powerpoint", extension: ".ppt", category: "presentation" },
  odp: { id: "odp", name: "OpenDocument Presentation", mimeType: "application/vnd.oasis.opendocument.presentation", extension: ".odp", category: "presentation" },

  // Images
  jpg: { id: "jpg", name: "JPEG Image", mimeType: "image/jpeg", extension: ".jpg", category: "image" },
  jpeg: { id: "jpeg", name: "JPEG Image", mimeType: "image/jpeg", extension: ".jpeg", category: "image" },
  png: { id: "png", name: "PNG Image", mimeType: "image/png", extension: ".png", category: "image" },
  gif: { id: "gif", name: "GIF Image", mimeType: "image/gif", extension: ".gif", category: "image" },
  bmp: { id: "bmp", name: "Bitmap Image", mimeType: "image/bmp", extension: ".bmp", category: "image" },
  tiff: { id: "tiff", name: "TIFF Image", mimeType: "image/tiff", extension: ".tiff", category: "image" },
  webp: { id: "webp", name: "WebP Image", mimeType: "image/webp", extension: ".webp", category: "image" },
  svg: { id: "svg", name: "SVG Image", mimeType: "image/svg+xml", extension: ".svg", category: "image" },

  // Unit conversion pseudo-formats (category: unit)
  length: { id: "length", name: "Length", mimeType: "application/x-unit-length", extension: "", category: "unit" },
  mass: { id: "mass", name: "Mass/Weight", mimeType: "application/x-unit-mass", extension: "", category: "unit" },
  temperature: { id: "temperature", name: "Temperature", mimeType: "application/x-unit-temperature", extension: "", category: "unit" },
  volume: { id: "volume", name: "Volume", mimeType: "application/x-unit-volume", extension: "", category: "unit" },
  area: { id: "area", name: "Area", mimeType: "application/x-unit-area", extension: "", category: "unit" },
  speed: { id: "speed", name: "Speed", mimeType: "application/x-unit-speed", extension: "", category: "unit" },
  "data-size": { id: "data-size", name: "Data Size", mimeType: "application/x-unit-data", extension: "", category: "unit" },
  angle: { id: "angle", name: "Angle", mimeType: "application/x-unit-angle", extension: "", category: "unit" },
  energy: { id: "energy", name: "Energy", mimeType: "application/x-unit-energy", extension: "", category: "unit" },
  pressure: { id: "pressure", name: "Pressure", mimeType: "application/x-unit-pressure", extension: "", category: "unit" },
  time: { id: "time", name: "Time", mimeType: "application/x-unit-time", extension: "", category: "unit" },

  // Metadata
  json: { id: "json", name: "JSON Metadata", mimeType: "application/json", extension: ".json", category: "metadata" },
  xml: { id: "xml", name: "XML Metadata", mimeType: "application/xml", extension: ".xml", category: "metadata" },
  yaml: { id: "yaml", name: "YAML Metadata", mimeType: "application/yaml", extension: ".yaml", category: "metadata" },
  csv_meta: { id: "csv_meta", name: "CSV Metadata", mimeType: "text/csv", extension: ".csv", category: "metadata" },
}

// Initialize registry with built-in formats
const formatRegistryInstance = new FormatRegistry(BUILTIN_FORMATS)

// Re-export the global registry
export { formatRegistryInstance as formatRegistry, FormatRegistry }

// Reverse index: mimeType -> format id for O(1) source format detection.
// Built once at module load instead of O(n) Object.values().find() per conversion.
const MIME_TYPE_TO_FORMAT: Map<string, string> = new Map()
for (const [id, format] of Object.entries(BUILTIN_FORMATS)) {
  MIME_TYPE_TO_FORMAT.set(format.mimeType, id)
}

/* ============================================================================
   Supported Conversion Pairs Matrix
   ============================================================================ */

const BUILTIN_PAIRS: ConversionPair[] = [
  // Word -> everything
  { source: "docx", target: "pdf", supported: true },
  { source: "docx", target: "txt", supported: true },
  { source: "docx", target: "html", supported: true },
  { source: "docx", target: "md", supported: true },
  { source: "docx", target: "rtf", supported: true },
  { source: "docx", target: "odt", supported: true },
  { source: "docx", target: "epub", supported: true },
  // PDF -> everything
  { source: "pdf", target: "docx", supported: true, mayLoseData: true },
  { source: "pdf", target: "txt", supported: true, requiresOcr: true },
  { source: "pdf", target: "html", supported: true, requiresOcr: true },
  { source: "pdf", target: "md", supported: true, requiresOcr: true },
  { source: "pdf", target: "epub", supported: true },
  { source: "pdf", target: "xlsx", supported: true, mayLoseData: true },
  { source: "pdf", target: "csv", supported: true, mayLoseData: true },
  // Spreadsheet -> everything
  { source: "xlsx", target: "pdf", supported: true },
  { source: "xlsx", target: "csv", supported: true },
  { source: "xlsx", target: "tsv", supported: true },
  { source: "xlsx", target: "html", supported: true },
  { source: "xlsx", target: "ods", supported: true },
  { source: "csv", target: "xlsx", supported: true },
  { source: "csv", target: "pdf", supported: true },
  { source: "csv", target: "tsv", supported: true },
  { source: "csv", target: "html", supported: true },
  { source: "csv", target: "ods", supported: true },
  // Presentation
  { source: "pptx", target: "pdf", supported: true },
  { source: "pptx", target: "html", supported: true },
  { source: "pptx", target: "odp", supported: true },
  // Image
  { source: "jpg", target: "png", supported: true },
  { source: "jpg", target: "webp", supported: true },
  { source: "jpg", target: "pdf", supported: true },
  { source: "png", target: "jpg", supported: true },
  { source: "png", target: "webp", supported: true },
  { source: "png", target: "pdf", supported: true },
  { source: "webp", target: "jpg", supported: true },
  { source: "webp", target: "png", supported: true },
  { source: "tiff", target: "jpg", supported: true },
  { source: "tiff", target: "png", supported: true },
  { source: "bmp", target: "jpg", supported: true },
  { source: "bmp", target: "png", supported: true },
  { source: "gif", target: "jpg", supported: true },
  { source: "gif", target: "png", supported: true },
  { source: "svg", target: "png", supported: true },
  { source: "svg", target: "jpg", supported: true },
  // Text
  { source: "txt", target: "pdf", supported: true },
  { source: "txt", target: "html", supported: true },
  { source: "txt", target: "docx", supported: true },
  { source: "md", target: "html", supported: true },
  { source: "md", target: "pdf", supported: true },
  { source: "md", target: "docx", supported: true },
  { source: "html", target: "pdf", supported: true },
  { source: "html", target: "docx", supported: true },
  { source: "html", target: "txt", supported: true },
  // EPub
  { source: "epub", target: "pdf", supported: true },
  { source: "epub", target: "txt", supported: true },
]

// Register all built-in pairs
formatRegistryInstance.registerPairs(BUILTIN_PAIRS)

// Helper functions that use the registry
export function getFormat(formatId: string): ConversionFormat | undefined {
  return formatRegistryInstance.getFormat(formatId)
}

export function getSupportedTargets(sourceFormat: string): string[] {
  return formatRegistryInstance.getSupportedTargets(sourceFormat)
}

export function getAllConversionPairs(): ConversionPair[] {
  return formatRegistryInstance.getAllPairs()
}

export function isPairSupported(source: string, target: string): boolean {
  return formatRegistryInstance.isPairSupported(source, target)
}

// Unit conversion factors (base unit = 1)
const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  length: {
    meter: 1,
    kilometer: 1000,
    centimeter: 0.01,
    millimeter: 0.001,
    micrometer: 0.000001,
    nanometer: 1e-9,
    mile: 1609.344,
    yard: 0.9144,
    foot: 0.3048,
    inch: 0.0254,
    nautical_mile: 1852,
  },
  mass: {
    kilogram: 1,
    gram: 0.001,
    milligram: 0.000001,
    metric_ton: 1000,
    pound: 0.453592,
    ounce: 0.0283495,
    stone: 6.35029,
  },
  temperature: {
    celsius: 1,
    fahrenheit: 1, // Special handling needed
    kelvin: 1,
  },
  volume: {
    liter: 1,
    milliliter: 0.001,
    cubic_meter: 1000,
    gallon_us: 3.78541,
    quart_us: 0.946353,
    pint_us: 0.473176,
    cup_us: 0.236588,
    fluid_ounce_us: 0.0295735,
    gallon_uk: 4.54609,
  },
  area: {
    square_meter: 1,
    square_kilometer: 1000000,
    square_centimeter: 0.0001,
    square_millimeter: 0.000001,
    hectare: 10000,
    acre: 4046.86,
    square_mile: 2589988,
    square_yard: 0.836127,
    square_foot: 0.092903,
    square_inch: 0.00064516,
  },
  speed: {
    meter_per_second: 1,
    kilometer_per_hour: 0.277778,
    mile_per_hour: 0.44704,
    knot: 0.514444,
    foot_per_second: 0.3048,
  },
  "data-size": {
    byte: 1,
    kilobyte: 1024,
    megabyte: 1024 * 1024,
    gigabyte: 1024 * 1024 * 1024,
    terabyte: 1024 * 1024 * 1024 * 1024,
    bit: 0.125,
    kilobit: 128,
    megabit: 128 * 1024,
    gigabit: 128 * 1024 * 1024,
  },
  angle: {
    radian: 1,
    degree: Math.PI / 180,
    gradian: Math.PI / 200,
    turn: 2 * Math.PI,
  },
  energy: {
    joule: 1,
    kilojoule: 1000,
    calorie: 4.184,
    kilocalorie: 4184,
    watt_hour: 3600,
    kilowatt_hour: 3600000,
    electronvolt: 1.602176634e-19,
    british_thermal_unit: 1055.06,
  },
  pressure: {
    pascal: 1,
    kilopascal: 1000,
    bar: 100000,
    psi: 6894.76,
    atmosphere: 101325,
    torr: 133.322,
  },
  time: {
    second: 1,
    millisecond: 0.001,
    microsecond: 0.000001,
    nanosecond: 1e-9,
    minute: 60,
    hour: 3600,
    day: 86400,
    week: 604800,
    month: 2629746,
    year: 31556952,
  },
}

function convertTemperature(value: number, fromUnit: string, toUnit: string): number {
  // Validate input is a finite number
  if (!isFinite(value) || isNaN(value)) {
    throw new Error(`Invalid temperature value: ${value}`)
  }

  // Absolute zero bounds
  const ABSOLUTE_ZERO_C = -273.15
  const ABSOLUTE_ZERO_F = -459.67
  const ABSOLUTE_ZERO_K = 0

  // Convert to Celsius first
  let celsius: number
  switch (fromUnit) {
    case "celsius":
      celsius = value
      if (celsius < ABSOLUTE_ZERO_C) {
        throw new Error(`Temperature below absolute zero: ${value}°C`)
      }
      break
    case "fahrenheit":
      if (value < ABSOLUTE_ZERO_F) {
        throw new Error(`Temperature below absolute zero: ${value}°F`)
      }
      celsius = (value - 32) * (5 / 9)
      break
    case "kelvin":
      if (value < ABSOLUTE_ZERO_K) {
        throw new Error(`Temperature below absolute zero: ${value}K`)
      }
      celsius = value - 273.15
      break
    default:
      throw new Error(`Unknown temperature unit: ${fromUnit}`)
  }

  // Validate result is not below absolute zero
  if (celsius < ABSOLUTE_ZERO_C) {
    throw new Error("Computed temperature below absolute zero")
  }

  // Convert from Celsius to target
  switch (toUnit) {
    case "celsius":
      return celsius
    case "fahrenheit":
      return celsius * (9 / 5) + 32
    case "kelvin":
      return celsius + 273.15
    default:
      throw new Error(`Unknown temperature unit: ${toUnit}`)
  }
}

// Re-exports for backward compatibility
export function convertUnit(value: number, category: string, fromUnit: string, toUnit: string): number {
  if (category === "temperature") {
    return convertTemperature(value, fromUnit, toUnit)
  }

  const conversions = UNIT_CONVERSIONS[category]
  if (!conversions) {
    throw new Error(`Unknown unit category: ${category}`)
  }

  const fromFactor = conversions[fromUnit]
  const toFactor = conversions[toUnit]

  if (fromFactor === undefined || toFactor === undefined) {
    throw new Error(`Unknown unit: ${fromUnit} or ${toUnit} in category ${category}`)
  }

  // Convert to base unit, then to target unit using Decimal for precision
  const baseValue = new Decimal(value).times(fromFactor)
  return baseValue.dividedBy(toFactor).toNumber()
}

export async function transformMetadata(input: {
  sourceFormat: string
  targetFormat: string
  data: Record<string, unknown>
  options?: Record<string, unknown>
}): Promise<string> {
  const { sourceFormat, targetFormat, data, options = {} } = input

  // If same format, return as-is
  if (sourceFormat === targetFormat) {
    const indent = typeof options.indent === "number" ? options.indent : 2
    return JSON.stringify(data, null, indent)
  }

  // Convert to intermediate JSON object
  let obj: Record<string, unknown>
  try {
    if (sourceFormat === "json") {
      obj = data
    } else if (sourceFormat === "yaml") {
      const jsYaml = require("js-yaml")
      obj = jsYaml.load(JSON.stringify(data)) as Record<string, unknown>
    } else if (sourceFormat === "xml") {
      const xml2js = require("xml2js")
      const result = await xml2js.parseStringPromise(JSON.stringify(data))
      obj = result as Record<string, unknown>
    } else if (sourceFormat === "csv_meta") {
      const csvParse = require("csv-parse/sync")
      const records = csvParse(JSON.stringify(data), { columns: true })
      obj = { records }
    } else {
      throw new Error(`Unsupported source format: ${sourceFormat}`)
    }
  } catch (e) {
    throw new Error(`Failed to parse ${sourceFormat}: ${e instanceof Error ? e.message : String(e)}`)
  }

  // Convert from JSON to target format
  try {
    if (targetFormat === "json") {
      const indent = typeof options.indent === "number" ? options.indent : 2
      return JSON.stringify(obj, null, indent)
    } else if (targetFormat === "yaml") {
      const jsYaml = require("js-yaml")
      return jsYaml.dump(obj)
    } else if (targetFormat === "xml") {
      const xml2js = require("xml2js")
      const builder = new xml2js.Builder()
      return builder.buildObject(obj)
    } else if (targetFormat === "csv_meta") {
      const csvStringify = require("csv-stringify/sync")
      const records = Array.isArray(obj.records) ? obj.records : [obj]
      return csvStringify(records, { header: true })
    } else {
      throw new Error(`Unsupported target format: ${targetFormat}`)
    }
  } catch (e) {
    throw new Error(`Failed to stringify ${targetFormat}: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// Export the format registry for backward compatibility
export const FORMAT_REGISTRY: Record<string, ConversionFormat> = Object.fromEntries(
  Array.from(formatRegistryInstance.getAllFormats().map(f => [f.id, f]))
)

export function getUnitCategories(): string[] {
  return Array.from(new Set(formatRegistryInstance.getAllFormats().filter(f => f.category === "unit").map(f => f.category)))
}

export function getUnitPairs(category: string): Array<{ from: string; to: string; factor: number }> {
  const conversions = UNIT_CONVERSIONS[category]
  if (!conversions) return []

  const units = Object.keys(conversions)
  const pairs: Array<{ from: string; to: string; factor: number }> = []

  for (const fromUnit of units) {
    const fromFactor = conversions[fromUnit]
    for (const toUnit of units) {
      if (fromUnit === toUnit) continue
      const toFactor = conversions[toUnit]
      pairs.push({
        from: fromUnit,
        to: toUnit,
        factor: fromFactor / toFactor,
      })
    }
  }

  return pairs
}

// Zod schema for conversion job input validation
export const conversionJobSchema = z.object({
  type: z.enum(["document", "unit", "metadata"]),
  source_format: z.string().min(1),
  target_format: z.string().min(1),
  source_url: z.string().optional(),
  value: z.string().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
  source_document_id: z.string().uuid().optional(),
})

// Type for server-side document conversion result
export interface ConvertDocumentResult {
  success: boolean
  outputUrl?: string
  mimeType?: string
  error?: string
}

// Server-side document conversion function
export async function convertDocumentServer(
  sourceContent: string,
  sourceMimeType: string,
  targetFormat: string,
  options?: Record<string, unknown>
): Promise<ConvertDocumentResult> {
  // This is a placeholder - actual implementation is in the worker
  // The worker uses libreoffice and pdfjs-dist for actual conversion
  return {
    success: false,
    error: "convertDocumentServer should only be called in the worker process",
  }
}