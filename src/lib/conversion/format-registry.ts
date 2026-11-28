import type { ConversionFormat, ConversionPair } from '../conversion'

/**
 * Extensible Format Registry
 * Allows plugins to register custom formats and conversion pairs at runtime
 */
export class FormatRegistry {
  private formats: Map<string, ConversionFormat> = new Map()
  private pairs: Map<string, ConversionPair[]> = new Map() // source -> targets
  private mimeTypeMap: Map<string, string> = new Map() // mimeType -> formatId

  constructor(initialFormats?: Record<string, ConversionFormat>) {
    if (initialFormats) {
      for (const [id, format] of Object.entries(initialFormats)) {
        this.registerFormat(format)
      }
    }
  }

  /**
   * Register a new format
   */
  registerFormat(format: ConversionFormat): void {
    if (this.formats.has(format.id)) {
      throw new Error(`Format ${format.id} already registered`)
    }
    this.formats.set(format.id, format)
    this.mimeTypeMap.set(format.mimeType, format.id)
  }

  /**
   * Unregister a format (for testing or hot-reload)
   */
  unregisterFormat(formatId: string): boolean {
    const format = this.formats.get(formatId)
    if (!format) return false
    this.formats.delete(formatId)
    this.mimeTypeMap.delete(format.mimeType)
    this.pairs.delete(formatId)
    // Also remove from other sources' target lists
    for (const [source, targets] of this.pairs.entries()) {
      this.pairs.set(source, targets.filter(p => p.target !== formatId))
    }
    return true
  }

  /**
   * Get a format by ID
   */
  getFormat(formatId: string): ConversionFormat | undefined {
    return this.formats.get(formatId)
  }

  /**
   * Get format by MIME type
   */
  getFormatByMimeType(mimeType: string): ConversionFormat | undefined {
    const id = this.mimeTypeMap.get(mimeType)
    return id ? this.formats.get(id) : undefined
  }

  /**
   * Get all registered formats
   */
  getAllFormats(): ConversionFormat[] {
    return Array.from(this.formats.values())
  }

  /**
   * Get all formats in a category
   */
  getFormatsByCategory(category: ConversionFormat['category']): ConversionFormat[] {
    return Array.from(this.formats.values()).filter(f => f.category === category)
  }

  /**
   * Register a conversion pair
   */
  registerPair(pair: ConversionPair): void {
    if (!this.formats.has(pair.source)) {
      throw new Error(`Source format ${pair.source} not registered`)
    }
    if (!this.formats.has(pair.target)) {
      throw new Error(`Target format ${pair.target} not registered`)
    }

    const existing = this.pairs.get(pair.source) || []
    const existingIndex = existing.findIndex(p => p.target === pair.target)
    
    if (existingIndex >= 0) {
      existing[existingIndex] = pair
    } else {
      existing.push(pair)
    }
    
    this.pairs.set(pair.source, existing)
  }

  /**
   * Get all supported targets for a source format
   */
  getSupportedTargets(sourceFormat: string): string[] {
    return (this.pairs.get(sourceFormat) || [])
      .filter(p => p.supported)
      .map(p => p.target)
  }

  /**
   * Check if a pair is supported
   */
  isPairSupported(source: string, target: string): boolean {
    const pairs = this.pairs.get(source) || []
    return pairs.some(p => p.target === target && p.supported)
  }

  /**
   * Get all conversion pairs
   */
  getAllPairs(): ConversionPair[] {
    const allPairs: ConversionPair[] = []
    for (const pairs of this.pairs.values()) {
      allPairs.push(...pairs)
    }
    return allPairs
  }

  /**
   * Get pair details (for mayLoseData, requiresOcr, etc.)
   */
  getPairDetails(source: string, target: string): ConversionPair | undefined {
    const pairs = this.pairs.get(source) || []
    return pairs.find(p => p.target === target)
  }

  /**
   * Bulk register pairs from array
   */
  registerPairs(pairs: ConversionPair[]): void {
    for (const pair of pairs) {
      this.registerPair(pair)
    }
  }

  /**
   * Check if a format exists
   */
  hasFormat(formatId: string): boolean {
    return this.formats.has(formatId)
  }
}

/**
 * Global format registry instance
 * Plugins can import this and call registerFormat/registerPair
 */
export const formatRegistry = new FormatRegistry()