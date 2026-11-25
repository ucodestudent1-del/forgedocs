import { NextRequest, NextResponse } from "next/server"
import { getPooledRouteClient } from "@/lib/supabase"
import { performCloudOCR } from "@/lib/ocr/cloud"
import { documentRateLimit } from "@/lib/rate-limiter"
import { validateCSRF } from "@/lib/csrf"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const dynamic = "force-dynamic"

export const POST = withErrorBoundary(async (request) => {
  const rateLimitError = await documentRateLimit(request)
  if (rateLimitError) return rateLimitError

  await validateCSRF(request)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const formData = await request.formData()
  const file = formData.get("file") as File
  const provider = (formData.get("provider") as 'aws' | 'google' | 'azure') || 'aws'

  if (!file) {
    throw createAppError("Missing file", 400, "MISSING_FILE")
  }

  // Server-side file size check (defense in depth against bypassed client limits)
  if (file.size > 50 * 1024 * 1024) {
    throw createAppError("File too large (max 50MB)", 400, "FILE_TOO_LARGE")
  }

  const validProviders = ['aws', 'google', 'azure']
  if (!validProviders.includes(provider)) {
    throw createAppError("Invalid provider", 400, "INVALID_PROVIDER")
  }

  const result = await performCloudOCR(file, provider)

  return NextResponse.json({
    text: result.text,
    confidence: result.confidence,
    pages: result.pages,
    provider: result.provider
  })
})
