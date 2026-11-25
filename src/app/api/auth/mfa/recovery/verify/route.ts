import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { consumeRecoveryToken } from "@/lib/mfa-recovery"
import { getPooledRouteClient } from "@/lib/supabase"
import { createAppError, withErrorBoundary } from "@/lib/api-error"

const verifySchema = z.object({
  token: z.string().min(1, "Recovery token is required"),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { token } = verifySchema.parse(body)

  // Consume the recovery token (verifies + single-use invalidation)
  const recoveryUserId = await consumeRecoveryToken(token)

  if (!recoveryUserId) {
    throw createAppError("Invalid or expired recovery token", 400, "INVALID_RECOVERY_TOKEN")
  }

  // Ensure the token belongs to the authenticated user
  if (recoveryUserId !== user.id) {
    throw createAppError("Recovery token does not match your account", 403, "FORBIDDEN")
  }

  // Reset MFA for the user
  await supabase
    .from("profiles")
    .update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_backup_codes: null,
      mfa_pending: false,
    })
    .eq("id", user.id)

  return NextResponse.json({ success: true, mfa_enabled: false })
})
