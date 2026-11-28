import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"
import { checkTierLimit, trackUsage, getTierLimits } from "@/lib/tierLimits"
import { validateFileMagicBytes } from "@/lib/security"
import { sanitizeFilename } from "@/lib/security"
import { scanFile } from "@/lib/malware-scan"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import logger from "@/lib/logger"

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/rtf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/tiff",
  "image/gif",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
]

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteAuthClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Get user's tier limits for max file size
  const limits = await getTierLimits(user.id)
  const MAX_FILE_SIZE = limits.max_file_size_mb * 1024 * 1024

  // Check document limit
  const limitCheck = await checkTierLimit(user.id, "documents_created", 1)
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  const formData = await req.formData()
  const file = formData.get("file") as File
  const folderId = formData.get("folder_id") as string | null

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file size against tier limit
  if (file.size > MAX_FILE_SIZE) {
    const maxMB = limits.max_file_size_mb
    return NextResponse.json({ error: `File size exceeds ${maxMB}MB limit for your plan` }, { status: 400 })
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  }

  // Validate folderId is a UUID if provided (prevents path traversal)
  if (folderId && !UUID_REGEX.test(folderId)) {
    return NextResponse.json({ error: "Invalid folder ID" }, { status: 400 })
  }

  // Verify parent folder exists and belongs to user
  if (folderId) {
    const { data: parent, error: parentError } = await supabase
      .from("documents")
      .select("id")
      .eq("id", folderId)
      .eq("user_id", user.id)
      .single()

    if (parentError || !parent) {
      throw createAppError("Parent folder not found", 404, "PARENT_FOLDER_NOT_FOUND")
    }
  }

  // Check storage limit
  const storageCheck = await checkTierLimit(user.id, "storage_bytes", file.size)
  if (!storageCheck.allowed) {
    return NextResponse.json(
      { error: `Storage limit reached. Upgrade your plan.` },
      { status: 403 }
    )
  }

  // Generate storage path
  const fileId = crypto.randomUUID()
  const ext = sanitizeFilename(file.name.split(".").pop() || "")
  const storagePath = `documents/${user.id}/${folderId ? folderId + "/" : ""}${fileId}.${ext}`

  // Validate file magic bytes (content inspection, not just MIME type from client)
  const arrayBuffer = await file.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)
  if (!validateFileMagicBytes(fileBytes, file.type)) {
    return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 })
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

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw createAppError("Failed to upload file", 500, "STORAGE_UPLOAD_ERROR")
  }

  // Create document record
  const { data: doc, error: docError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      parent_id: folderId,
      title: sanitizeFilename(file.name),
      storage_path: storagePath,
      mime_type: file.type,
      file_size: file.size,
      version: 1,
    })
    .select()
    .single()

  if (docError) {
    // Clean up storage on DB error - MUST succeed or alert
    const { error: cleanupError } = await supabase.storage.from("documents").remove([storagePath])
    if (cleanupError) {
      logger.error("CRITICAL: Storage cleanup failed after DB error - MANUAL INTERVENTION REQUIRED", {
        storagePath,
        dbError: docError.message,
        cleanupError: cleanupError.message,
      })
      // Alert on-call via PagerDuty/Slack webhook if configured
      if (process.env.ALERT_WEBHOOK_URL) {
        try {
          await fetch(process.env.ALERT_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              level: "critical",
              message: "Storage cleanup failed after DB error",
              storagePath,
              dbError: docError.message,
              cleanupError: cleanupError.message,
            }),
          })
        } catch {}
      }
    }
    throw createAppError("Failed to create document record", 500, "DATABASE_ERROR")
  }

  // Track usage
  await trackUsage(user.id, "documents_created", 1)
  await trackUsage(user.id, "storage_bytes", file.size)

  return NextResponse.json({ file: doc }, { status: 201 })
})
