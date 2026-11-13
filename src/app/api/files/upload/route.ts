import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limit"
import { checkTierLimit, trackUsage } from "@/lib/tierLimits"

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
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

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  try {
    await validateCSRF(req)
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check document limit
  const limitCheck = await checkTierLimit(user.id, "documents_created", 1)
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Document limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const folderId = formData.get("folder_id") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 50MB limit" }, { status: 400 })
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
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
    const ext = file.name.split(".").pop() || ""
    const storagePath = `documents/${user.id}/${folderId ? folderId + "/" : ""}${fileId}.${ext}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("Storage upload error:", uploadError)
      return NextResponse.json({ error: "Failed to upload file" }, { status: 500 })
    }

    // Create document record
    const { data: doc, error: docError } = await (supabase as any)
      .from("documents")
      .insert({
        user_id: user.id,
        parent_id: folderId,
        title: file.name,
        storage_path: storagePath,
        mime_type: file.type,
        file_size: file.size,
        version: 1,
      })
      .select()
      .single()

    if (docError) {
      // Clean up storage on DB error
      await supabase.storage.from("documents").remove([storagePath])
      return NextResponse.json({ error: docError.message }, { status: 500 })
    }

    // Track usage
    await trackUsage(user.id, "documents_created", 1)
    await trackUsage(user.id, "storage_bytes", file.size)

    return NextResponse.json({ file: doc }, { status: 201 })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}