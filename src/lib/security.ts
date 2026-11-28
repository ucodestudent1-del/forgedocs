import { Buffer } from "buffer"

export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[\s.]+|[\s.]+$/g, "")
    .slice(0, 255)
}

export const ALLOWED_FILE_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".txt", ".csv", ".md", ".rtf",
  ".jpg", ".jpeg", ".png", ".webp", ".svg", ".tiff", ".gif",
  ".odt", ".ods", ".odp",
])

export function validateFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."))
  return ALLOWED_FILE_EXTENSIONS.has(ext)
}

export function validateFileMagicBytes(fileBytes: Uint8Array | Buffer, mimeType: string): boolean {
  const bytes = Buffer.from(fileBytes)
  if (bytes.length < 4) return false

  const signatures: Record<string, number[][]> = {
    "application/pdf": [[0x25, 0x50, 0x44, 0x46]], // %PDF
    "application/msword": [[0xd0, 0xcf, 0x11, 0xe0]], // OLE compound document
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
      [0x50, 0x4b, 0x03, 0x04], // ZIP-based (docx)
      [0x50, 0x4b, 0x05, 0x06], // ZIP empty archive
      [0x50, 0x4b, 0x07, 0x08], // ZIP spanned archive
    ],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
    "text/plain": [], // No magic bytes for plain text
    "text/csv": [], // No magic bytes for CSV
    "text/markdown": [], // No magic bytes for markdown
    "application/rtf": [[0x7b, 0x5c, 0x72, 0x74]], // {\rt
    "image/jpeg": [[0xff, 0xd8, 0xff]],
    "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    "image/webp": [[0x52, 0x49, 0x46, 0x46]], // RIFF
    "image/svg+xml": [], // XML-based, check content
    "image/tiff": [[0x49, 0x49, 0x2a, 0x00], [0x4d, 0x4d, 0x00, 0x2a]], // II or MM
    "image/gif": [[0x47, 0x49, 0x46, 0x38]], // GIF8
    "application/vnd.oasis.opendocument.text": [[0x50, 0x4b, 0x03, 0x04]],
    "application/vnd.oasis.opendocument.spreadsheet": [[0x50, 0x4b, 0x03, 0x04]],
    "application/vnd.oasis.opendocument.presentation": [[0x50, 0x4b, 0x03, 0x04]],
  }

  const expectedSignatures = signatures[mimeType]
  if (!expectedSignatures || expectedSignatures.length === 0) {
    // For types without magic bytes (text, svg), accept if we can't verify
    return true
  }

  return expectedSignatures.some((sig) => sig.every((byte, i) => bytes[i] === byte))
}

export function sanitizeHtml(html: string): string {
  // Basic HTML sanitization - removes script tags, event handlers, etc.
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:/gi, "")
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function sanitizePath(path: string): string {
  return path
    .replace(/\.\./g, "")
    .replace(/\/+/g, "/")
    .replace(/^\/+|\/+$/g, "")
}