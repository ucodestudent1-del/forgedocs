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

export function generateSignedUrl(bucket: string, path: string, expiresIn: number = 900): string {
  // In production, use supabase.storage.from(bucket).createSignedUrl(path, expiresIn)
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/download?bucket=${bucket}&path=${encodeURIComponent(path)}&expires=${expiresIn}`
}
