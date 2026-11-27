import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import logger from "@/lib/logger"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = withErrorBoundary(async (req: Request) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteAuthClient()
  const url = new URL(req.url)
  const code = url.searchParams.get("code")
  const next = url.searchParams.get("next") ?? "/dashboard"

  if (!code) {
    throw createAppError("Missing authorization code", 400, "MISSING_CODE")
  }

  const { error } = await (supabase.auth as any).exchangeCodeForSession(code)

  if (error) {
    logger.error("[AUTH CALLBACK] exchangeCodeForSession failed", {
      error: error.message,
      code: (error as any)?.code,
    })
    throw createAppError("Invalid or expired authorization code", 400, "INVALID_CODE")
  }

  await rotateCSRFToken()

  const redirectUrl = new URL(next, req.url)
  return NextResponse.redirect(redirectUrl)
})

export const POST = withErrorBoundary(async (req: Request) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteAuthClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw createAppError(error.message, 400, "LOGOUT_ERROR")
  }

  await rotateCSRFToken()

  return NextResponse.json({ success: true })
})
