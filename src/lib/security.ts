export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, { count: number; resetTime: number }>()

  return function rateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const record = store.get(identifier)

    if (!record || now > record.resetTime) {
      store.set(identifier, { count: 1, resetTime: now + windowMs })
      return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: record.resetTime }
    }

    record.count++
    return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime }
  }
}

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

export async function generateSignedUrl(bucket: string, path: string, expiresIn: number = 900): Promise<string> {
  const { createRouteClient } = await import("@/lib/supabase")
  const supabase = await createRouteClient()
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  return data?.signedUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/download?bucket=${bucket}&path=${encodeURIComponent(path)}&expires=${expiresIn}`
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
  "text/plain": [Buffer.from([])], // Any text (can't validate magic bytes)
  "text/csv": [Buffer.from([])], // Any text (can't validate magic bytes)
  "image/jpeg": [Buffer.from([0xFF, 0xD8, 0xFF])], // JPEG
  "image/png": [Buffer.from([0x89, 0x50, 0x4E, 0x47])], // PNG
  "image/webp": [Buffer.from([0x52, 0x49, 0x46, 0x46])], // RIFF (WEBP)
  "image/tiff": [
    Buffer.from([0x49, 0x49, 0x2A, 0x00]), // Little endian TIFF
    Buffer.from([0x4D, 0x4D, 0x00, 0x2A]), // Big endian TIFF
  ],
  "image/gif": [Buffer.from([0x47, 0x49, 0x46, 0x38])], // GIF8
  "image/svg+xml": [Buffer.from([0x3C, 0x3F, 0x78, 0x6D, 0x6C])], // <?xml
  "application/rtf": [Buffer.from([0x7B, 0x5C, 0x52, 0x54, 0x46])], // {\RTF
}

export function validateFileMagicBytes(fileBytes: Uint8Array, mimeType: string): boolean {
  const expected = MAGIC_BYTES[mimeType]
  if (!expected || expected.length === 0 || expected[0].length === 0) {
    return true // Cannot validate magic bytes for text files
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
