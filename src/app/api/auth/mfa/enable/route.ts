import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import {
  generateSecret,
  getTotpUri,
  generateQrCode,
  generateBackupCodes,
  hashBackupCode,
  encryptSecret,
  verifyToken,
} from "@/lib/mfa"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Check if MFA already enabled
  const { data: existing } = await supabase
    .from("mfa_profiles")
    .select("enabled")
    .eq("user_id", user.id)
    .single()

  if (existing?.enabled) {
    return NextResponse.json({ error: "MFA already enabled" }, { status: 400 })
  }

  const secret = generateSecret()
  const otpUri = getTotpUri(secret, user.email || "")
  const qrCode = await generateQrCode(otpUri)
  const backupCodes = generateBackupCodes(10)
  const hashedBackupCodes = backupCodes.map((c) => hashBackupCode(c))

  // Upsert MFA profile (pending verification)
  await supabase
    .from("mfa_profiles")
    .upsert({
      user_id: user.id,
      totp_secret_encrypted: encryptSecret(secret),
      enabled: false,
      backup_codes: hashedBackupCodes,
    })
    .eq("user_id", user.id)

  await logAuditEvent({
    userId: user.id,
    action: "mfa.setup_started",
    entityType: "mfa_profiles",
    entityId: user.id,
    severity: "medium",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
  })

  await rotateCSRFToken()

  return NextResponse.json({
    qr_code: qrCode,
    backup_codes: backupCodes, // shown once to user
  })
})
