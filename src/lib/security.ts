export function validateFileType(filename: string, allowedMimeTypes: string[]): boolean {
  const ext = filename.split(".").pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    csv: "text/csv",
    txt: "text/plain",
    html: "text/html",
  }
  const mime = mimeMap[ext || ""]
  return mime ? allowedMimeTypes.includes(mime) : false
}

export function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_")
}

import logger from "@/lib/logger"

export async function generateSignedUrl(bucket: string, path: string, expiresIn: number = 900): Promise<string> {
  const { createRouteClient } = await import("@/lib/supabase")
  const supabase = await createRouteClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)

  if (error || !data?.signedUrl) {
    logger.error("Failed to generate signed URL", { bucket, path, error: error?.message })
    throw new Error("Failed to generate signed URL")
  }

  return data.signedUrl
}

const MAGIC_BYTES: Record<string, Buffer[]> = {
  "application/pdf": [Buffer.from([0x25, 0x50, 0x44, 0x46])], // %PDF
  "application/msword": [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])], // DOC
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP-based (DOCX)
  ],
  "application/vnd.ms-excel": [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])], // XLS
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP-based (XLSX)
  ],
  "application/vnd.ms-powerpoint": [Buffer.from([0xD0, 0xCF, 0x11, 0xE0])], // PPT
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
    Buffer.from([0x50, 0x4B, 0x03, 0x04]), // ZIP-based (PPTX)
  ],
  "text/plain": [Buffer.from([])], // Any text (validated via content scan below)
  "text/csv": [Buffer.from([])], // Any text (validated via content scan below)
  "image/jpeg": [Buffer.from([0xFF, 0xD8, 0xFF])], // JPEG
  "image/png": [Buffer.from([0x89, 0x50, 0x4E, 0x47])], // PNG
  "image/webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF (WEBP)
  "image/tiff": [
    Buffer.from([0x49, 0x49, 0x2A, 0x00]), // Little endian TIFF
    Buffer.from([0x4D, 0x4D, 0x00, 0x2A]), // Big endian TIFF
  ],
  "image/gif": [Buffer.from([0x47, 0x49, 0x46, 0x38])], // GIF8
  "image/svg+xml": [Buffer.from([0x3C, 0x3F, 0x78, 0x6D, 0x6C])], // <?xml
  "text/html": [Buffer.from([])], // HTML (validated via content scan below)
  "application/rtf": [Buffer.from([0x7B, 0x5C, 0x52, 0x54, 0x46])], // {\RTF
}

const DANGEROUS_TEXT_PATTERNS: RegExp[] = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
  /<embed[\s\S]*?>/gi,
  /<object[\s\S]*?>[\s\S]*?<\/object>/gi,
  /<\?php/gi,
  /<\?=/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
]

export function validateFileMagicBytes(fileBytes: Uint8Array, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType]
  if (!expected || expected.length === 0 || expected[0].length === 0) {
    // Text/HTML files: scan the full content for dangerous patterns
    const text = Buffer.from(fileBytes).toString("utf8")
    return !DANGEROUS_TEXT_PATTERNS.some((pattern) => pattern.test(text))
  }

  // SVG files pass magic bytes but can contain embedded JavaScript —
  // content-scan them in addition to the magic byte check.
  if (mimeType === "image/svg+xml") {
    const text = Buffer.from(fileBytes).toString("utf8")
    if (DANGEROUS_TEXT_PATTERNS.some((pattern) => pattern.test(text))) {
      return false
    }
  }

  // Check if file starts with any of the expected magic byte sequences
  for (const magic of expected) {
    if (fileBytes.length >= magic.length) {
      let match = true
      for (let i = 0; i < magic.length; i++) {
        if (fileBytes[i] !== magic[i]) {
          match = false
          break
        }
      }
      if (match) return true
    }
  }
  return false
}
