import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { verifyToken, generateBackupCodes, hashBackupCode, resolveStoredSecret } from "@/lib/mfa"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const backupCodesSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
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
  const { token } = backupCodesSchema.parse(body)

  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_secret, mfa_enabled")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.mfa_enabled) {
    throw createAppError("MFA not enabled", 400, "MFA_NOT_ENABLED")
  }

  const secretResult = resolveStoredSecret(profile.mfa_secret)
  if (!secretResult.secret) {
    throw createAppError("MFA secret not available", 500, "MFA_SECRET_UNAVAILABLE")
  }

  const isValid = verifyToken(secretResult.secret, token)

  if (!isValid) {
    throw createAppError("Invalid token", 400, "INVALID_TOKEN")
  }

  const backupCodes = generateBackupCodes(10)
  const hashedBackupCodes = backupCodes.map(hashBackupCode)

  await supabase
    .from("profiles")
    .update({ mfa_backup_codes: hashedBackupCodes })
    .eq("id", user.id)

  return NextResponse.json({ backup_codes: backupCodes })
})
