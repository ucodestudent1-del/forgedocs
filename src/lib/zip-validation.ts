/**
 * Validate ZIP-based file contents (DOCX, XLSX, PPTX, etc.)
 * Checks for dangerous content like macros, scripts, or suspicious XML parts.
 *
 * Parses the ZIP central directory to locate file entries, then extracts and
 * inspects text-based parts (XML, rels, etc.) for dangerous patterns without
 * requiring an external ZIP library.
 */

const LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50 // "PK\x03\x04"
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50 // "PK\x01\x02"
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50 // "PK\x05\x06"

const DANGEROUS_PATTERNS = [
  /<w:macro[^>]*>/gi,
  /<w:script[^>]*>/gi,
  /<m:macro[^>]*>/gi,
  /<p:macro[^>]*>/gi,
  /vbaProject\.bin/gi,
  /<[^>]*onload\s*=/gi,
  /<[^>]*onerror\s*>/gi,
  /javascript:/gi,
  /<\?php/gi,
  /<\?=/gi,
]

function containsDangerousContent(content: string): boolean {
  return DANGEROUS_PATTERNS.some((pattern) => pattern.test(content))
}

function readUint32LE(data: DataView, offset: number): number {
  return data.getUint32(offset, true)
}

function readUint16LE(data: DataView, offset: number): number {
  return data.getUint16(offset, true)
}

/**
 * Parse ZIP central directory to extract file entry metadata.
 * Returns array of { offset, compressedSize, uncompressedSize, method, name }
 */
function parseZipCentralDirectory(fileBytes: Uint8Array): Array<{
  name: string
  dataOffset: number
  compressedSize: number
  uncompressedSize: number
  method: number
}> {
  const view = new DataView(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength)
  const files: Array<{
    name: string
    dataOffset: number
    compressedSize: number
    uncompressedSize: number
    method: number
  }> = []

  // Find End of Central Directory (EOCD) record by scanning from end
  let eocdOffset = -1
  for (let i = fileBytes.length - 4; i >= Math.max(0, fileBytes.length - 65536); i--) {
    if (readUint32LE(view, i) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) {
      eocdOffset = i
      break
    }
  }
  if (eocdOffset === -1) return files

  const centralDirectoryOffset = readUint32LE(view, eocdOffset + 16)
  const centralDirectorySize = readUint32LE(view, eocdOffset + 12)
  const totalEntries = readUint16LE(view, eocdOffset + 10)

  let cdOffset = centralDirectoryOffset
  for (let i = 0; i < totalEntries; i++) {
    if (cdOffset + 46 > fileBytes.length) break
    if (readUint32LE(view, cdOffset) !== CENTRAL_DIRECTORY_SIGNATURE) break

    const nameLength = readUint16LE(view, cdOffset + 28)
    const extraLength = readUint16LE(view, cdOffset + 30)
    const commentLength = readUint16LE(view, cdOffset + 32)
    const localHeaderOffset = readUint32LE(view, cdOffset + 42)
    const compressedSize = readUint32LE(view, cdOffset + 20)
    const uncompressedSize = readUint32LE(view, cdOffset + 24)
    const method = readUint16LE(view, cdOffset + 10)

    const nameStart = cdOffset + 46
    const nameEnd = nameStart + nameLength
    if (nameEnd > fileBytes.length) break
    const name = Buffer.from(fileBytes.slice(nameStart, nameEnd)).toString("utf-8")

    files.push({
      name,
      dataOffset: localHeaderOffset,
      compressedSize,
      uncompressedSize,
      method,
    })

    cdOffset += 46 + nameLength + extraLength + commentLength
  }

  return files
}

/**
 * Extract and decompress a file entry from the ZIP.
 * Supports STORED (method 0) and DEFLATED (method 8) compression.
 */
async function extractZipEntry(
  fileBytes: Uint8Array,
  entry: { dataOffset: number; compressedSize: number; uncompressedSize: number; method: number }
): Promise<string | null> {
  const view = new DataView(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength)

  // Local file header is 30 bytes minimum
  const headerOffset = entry.dataOffset
  if (headerOffset + 30 > fileBytes.length) return null
  if (readUint32LE(view, headerOffset) !== LOCAL_FILE_HEADER_SIGNATURE) return null

  const nameLength = readUint16LE(view, headerOffset + 26)
  const extraLength = readUint16LE(view, headerOffset + 28)
  const dataStart = headerOffset + 30 + nameLength + extraLength
  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > fileBytes.length) return null

  const compressedData = fileBytes.slice(dataStart, dataEnd)

  if (entry.method === 0) {
    // STORED - no compression
    return Buffer.from(compressedData).toString("binary")
  }

  if (entry.method === 8) {
    // DEFLATED - use zlib
    try {
      const zlib = await import("zlib")
      const inflated = zlib.inflateSync(compressedData)
      return inflated.toString("utf-8")
    } catch {
      return null
    }
  }

  // Unsupported compression method
  return null
}

export function validateZipContents(fileBytes: Uint8Array): boolean {
  try {
    if (fileBytes.length < 4) return false
    if (fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4b) return false

    const entries = parseZipCentralDirectory(fileBytes)

    for (const entry of entries) {
      // Only inspect text-based parts (XML, rels, etc.)
      const isTextPart =
        entry.name.endsWith(".xml") ||
        entry.name.endsWith(".rels") ||
        entry.name.endsWith(".txt") ||
        entry.name.includes("[Content_Types]") ||
        entry.name.endsWith(".bin") // vbaProject.bin check

      if (!isTextPart) continue

      const content = extractZipEntrySync(fileBytes, entry)
      if (content && containsDangerousContent(content)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}

function extractZipEntrySync(
  fileBytes: Uint8Array,
  entry: { dataOffset: number; compressedSize: number; uncompressedSize: number; method: number }
): string | null {
  const view = new DataView(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength)

  const headerOffset = entry.dataOffset
  if (headerOffset + 30 > fileBytes.length) return null
  if (readUint32LE(view, headerOffset) !== LOCAL_FILE_HEADER_SIGNATURE) return null

  const nameLength = readUint16LE(view, headerOffset + 26)
  const extraLength = readUint16LE(view, headerOffset + 28)
  const dataStart = headerOffset + 30 + nameLength + extraLength
  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > fileBytes.length) return null

  const compressedData = fileBytes.slice(dataStart, dataEnd)

  if (entry.method === 0) {
    return Buffer.from(compressedData).toString("binary")
  }

  if (entry.method === 8) {
    try {
      const zlib = require("zlib")
      const inflated = zlib.inflateSync(compressedData)
      return inflated.toString("utf-8")
    } catch {
      return null
    }
  }

  return null
}

export async function validateZipContentsAsync(fileBytes: Uint8Array): Promise<boolean> {
  try {
    if (fileBytes.length < 4) return false
    if (fileBytes[0] !== 0x50 || fileBytes[1] !== 0x4b) return false

    const entries = parseZipCentralDirectory(fileBytes)

    for (const entry of entries) {
      const isTextPart =
        entry.name.endsWith(".xml") ||
        entry.name.endsWith(".rels") ||
        entry.name.endsWith(".txt") ||
        entry.name.includes("[Content_Types]") ||
        entry.name.endsWith(".bin")

      if (!isTextPart) continue

      const content = await extractZipEntry(fileBytes, entry)
      if (content && containsDangerousContent(content)) {
        return false
      }
    }

    return true
  } catch {
    return false
  }
}
