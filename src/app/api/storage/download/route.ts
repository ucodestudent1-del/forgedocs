import { NextResponse } from "next/server"
import { documentRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { getRouteClient } from "@/lib/supabase"

export const GET = withErrorBoundary(async (req: Request) => {
  const rateLimitError = await documentRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const url = new URL(req.url)
  const path = url.searchParams.get("path")
  const bucket = "documents"

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
