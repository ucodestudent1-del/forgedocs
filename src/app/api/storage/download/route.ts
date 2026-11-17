import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req: Request) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

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
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const url = new URL(req.url)
  const path = url.searchParams.get("path")
  const bucket = url.searchParams.get("bucket") || "documents"

  if (!path) {
    throw createAppError("Path parameter required", 400, "MISSING_PARAM")
  }

  // Prevent path traversal: reject paths with .. or absolute paths
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    throw createAppError("Invalid path", 400, "INVALID_PATH")
  }

  // Verify user owns this file (path should start with user.id)
  if (!path.startsWith(`${user.id}/`)) {
    throw createAppError("Forbidden", 403, "FORBIDDEN")
  }

  // Generate signed URL (valid for 5 minutes)
  const { data: signedUrlData, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 300)

  if (error || !signedUrlData?.signedUrl) {
    throw createAppError("File not found", 404, "NOT_FOUND")
  }

  // Redirect to signed URL
  return NextResponse.redirect(signedUrlData.signedUrl)
})
