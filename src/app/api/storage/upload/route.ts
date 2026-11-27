import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { sanitizeFilename, validateFileMagicBytes } from "@/lib/security"
import { scanFile } from "@/lib/malware-scan"
import { sanitizeHtml } from "@/lib/sanitize"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { getPooledRouteClient } from "@/lib/supabase"

export const maxDuration = 60

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Check Content-Length before parsing body (early rejection of oversized requests)
  const contentLength = req.headers.get("content-length")
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > 15 * 1024 * 1024) { // 15MB max request body (10MB file + overhead)
      throw createAppError("Request body too large", 413, "REQUEST_TOO_LARGE")
    }
  }

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    throw createAppError("No file provided", 400, "NO_FILE_PROVIDED")
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw createAppError("File too large (max 10MB)", 400, "FILE_TOO_LARGE")
  }

  // Validate file type by MIME type
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ]
  if (!allowedTypes.includes(file.type)) {
    throw createAppError("File type not supported", 400, "INVALID_FILE_TYPE")
  }

  // Validate file magic bytes (content inspection, not just MIME type from client)
  const arrayBuffer = await file.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)
  const magicBytesValid = validateFileMagicBytes(fileBytes, file.type)
  if (!magicBytesValid) {
    throw createAppError("File content does not match declared type", 400, "INVALID_FILE_CONTENT")
  }

  // Verify file extension matches content type
  const ext = file.name.split(".").pop()?.toLowerCase()
  const extToMime: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ppt: "application/vnd.ms-powerpoint",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    txt: "text/plain",
    csv: "text/csv",
  }
  const expectedMime = extToMime[ext || ""]
  if (!expectedMime || expectedMime !== file.type) {
    throw createAppError("File extension does not match content type", 400, "EXTENSION_MISMATCH")
  }

  // Sanitize SVG files for XSS
  if (file.type === "image/svg+xml") {
    const svgText = Buffer.from(fileBytes).toString("utf8")
    const sanitized = sanitizeHtml(svgText)
    if (sanitized !== svgText) {
      throw createAppError("SVG contains potentially unsafe content", 400, "UNSAFE_SVG")
    }
  }

  // Malware scan (ClamAV when available; permissive by default)
  const scanResult = await scanFile(fileBytes, file.name)
  if (!scanResult.clean) {
    throw createAppError(
      scanResult.threat === "scanner_unavailable"
        ? "Malware scanner unavailable — upload blocked"
        : "Malware detected in file",
      400,
      "MALWARE_DETECTED"
    )
  }

  const fileName = `${user.id}/${randomUUID()}-${sanitizeFilename(file.name)}`

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, file)

  if (error) {
    throw createAppError(error.message, 500, "STORAGE_UPLOAD_ERROR")
  }

  // Generate signed URL (valid for 1 hour)
  const { data: signedUrlData } = await supabase.storage
    .from("documents")
    .createSignedUrl(fileName, 3600)

  return NextResponse.json({
    url: signedUrlData?.signedUrl,
    path: fileName,
    name: file.name,
    size: file.size,
    type: file.type,
  })
})


