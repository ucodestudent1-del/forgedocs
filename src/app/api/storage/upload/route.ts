import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { documentRateLimit } from "@/lib/rate-limiter"

export const maxDuration = 60

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
}

function validateMagicBytes(file: File, expectedMime: string): boolean {
  const expected = MAGIC_BYTES[expectedMime]
  if (!expected || expected.length === 0 || expected[0].length === 0) {
    return true // Cannot validate (text files)
  }
  // We need to read the file buffer to check magic bytes
  // This is done after we get the arrayBuffer
  return false // Placeholder - actual check done below
}

export async function POST(req: Request) {
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

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Check Content-Length before parsing body (early rejection of oversized requests)
  const contentLength = req.headers.get("content-length")
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > 15 * 1024 * 1024) { // 15MB max request body (10MB file + overhead)
      return NextResponse.json({ error: "Request body too large" }, { status: 413 })
    }
  }

  const formData = await req.formData()
  const file = formData.get("file") as File

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 })
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 })
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
    return NextResponse.json({ error: "File type not supported" }, { status: 400 })
  }

  // Validate file magic bytes (content inspection, not just MIME type from client)
  const arrayBuffer = await file.arrayBuffer()
  const fileBytes = new Uint8Array(arrayBuffer)
  const magicBytesValid = validateFileMagicBytes(fileBytes, file.type)
  if (!magicBytesValid) {
    return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 })
  }

  const fileName = `${user.id}/${crypto.randomUUID()}-${file.name}`

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(fileName, file)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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
}

function validateFileMagicBytes(fileBytes: Uint8Array, mimeType: string): boolean {
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
