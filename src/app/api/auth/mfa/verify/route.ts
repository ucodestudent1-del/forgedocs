import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import {
  verifyToken,
  hashBackupCode,
  generateBackupCodes,
  decryptSecret,
} from "@/lib/mfa"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

const verifySchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
  backup_code: z.string().optional(),
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
  const { token, backup_code } = verifySchema.parse(body)

  const { data: mfa } = await supabase
    .from("mfa_profiles")
    .select("totp_secret_encrypted, enabled, backup_codes")
    .eq("user_id", user.id)
    .single()

  if (!mfa) {
    throw createAppError("MFA not set up", 400, "MFA_NOT_SETUP")
  }

  // Resolve the TOTP secret (decrypt if needed)
  const mfaSecret = mfa.totp_secret_encrypted ? decryptSecret(mfa.totp_secret_encrypted) : null

  if (!mfaSecret) {
    throw createAppError("MFA not set up", 400, "MFA_NOT_SETUP")
  }

  let isValid = false

  // Verify TOTP token
  if (token) {
    isValid = verifyToken(mfaSecret, token)
  }

  // Verify backup code
  if (!isValid && backup_code) {
    const backupCodes = mfa.backup_codes ?? []
    const providedHash = hashBackupCode(backup_code)
    const matchedIndex = backupCodes.findIndex((c: string) => c === providedHash)
    if (matchedIndex >= 0) {
      isValid = true
      // Consume the backup code (remove it)
      const remainingCodes = backupCodes.filter((_: string, i: number) => i !== matchedIndex)
      void supabase
        .from("mfa_profiles")
        .update({ backup_codes: remainingCodes })
        .eq("user_id", user.id)
    }
  }

  if (!isValid) {
    await logAuditEvent({
      userId: user.id,
      action: "mfa.verify_failed",
      entityType: "mfa_profiles",
      entityId: user.id,
      severity: "medium",
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    })
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  // If MFA not yet enabled, this is the enrollment completion
  if (!mfa.enabled) {
    await supabase
      .from("mfa_profiles")
      .update({ enabled: true })
      .eq("user_id", user.id)

    await logAuditEvent({
      userId: user.id,
      action: "mfa.enabled",
      entityType: "mfa_profiles",
      entityId: user.id,
      severity: "high",
      ipAddress: getClientIp(req),
      userAgent: getClientUserAgent(req),
    })

    await rotateCSRFToken()

    return NextResponse.json({ success: true, mfa_enabled: true })
  }

  // Re-verification (e.g. step-up auth)
  await logAuditEvent({
    userId: user.id,
    action: "mfa.verified",
    entityType: "mfa_profiles",
    entityId: user.id,
    severity: "low",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  await rotateCSRFToken()

  return NextResponse.json({ success: true, mfa_enabled: true })
})
