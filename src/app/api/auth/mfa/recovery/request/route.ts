import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { createMfaRecoveryToken } from "@/lib/mfa-recovery"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { email } = requestSchema.parse(body)

  // Only allow recovery for the authenticated user's own email
  if (email !== user.email) {
    throw createAppError("Cannot request recovery for another user's email", 403, "FORBIDDEN")
  }

  // Check MFA is enabled (recovery only applies when MFA is active)
  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_enabled, email")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.mfa_enabled) {
    throw createAppError("MFA is not enabled for this account", 400, "MFA_NOT_ENABLED")
  }

  await createMfaRecoveryToken(user.id, email)

  // Always return success to avoid enumerating whether MFA is enabled
  return NextResponse.json({ success: true })
})
