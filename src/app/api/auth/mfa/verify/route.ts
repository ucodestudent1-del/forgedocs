import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { verifyToken, hashBackupCode, generateBackupCodes, encryptSecret, isEncryptedSecret, resolveStoredSecret } from "@/lib/mfa"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const verifySchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
  secret: z.string().optional(),
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
  const { token, secret } = verifySchema.parse(body)

  const { data: profile } = await supabase
    .from("profiles")
    .select("mfa_secret, mfa_enabled, mfa_backup_codes, mfa_pending")
    .eq("id", user.id)
    .single()

  if (!profile) {
    throw createAppError("Profile not found", 404, "PROFILE_NOT_FOUND")
  }

  // Only allow verification if MFA is pending (enable was started but not completed)
  if (!profile.mfa_pending && !profile.mfa_enabled) {
    return NextResponse.json({ error: "MFA not set up" }, { status: 400 })
  }

  const storedSecret = profile.mfa_secret
  const mfaSecret = secret || resolveStoredSecret(storedSecret)

  if (!mfaSecret) {
    return NextResponse.json({ error: "MFA not set up" }, { status: 400 })
  }

  const isValid = verifyToken(mfaSecret, token)

  if (!isValid) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 })
  }

  // Lazily re-encrypt any legacy plaintext MFA secret on first successful verify.
  if (storedSecret && !isEncryptedSecret(storedSecret) && !secret) {
    void supabase
      .from("profiles")
      .update({ mfa_secret: encryptSecret(mfaSecret) })
      .eq("id", user.id)
  }

  // If this is the initial enrollment (pending), generate and return backup codes once
  if (profile.mfa_pending && !profile.mfa_enabled) {
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    await supabase
      .from("profiles")
      .update({
        mfa_enabled: true,
        mfa_pending: false,
        mfa_backup_codes: hashedBackupCodes,
      })
      .eq("id", user.id)

    return NextResponse.json({
      success: true,
      mfa_enabled: true,
      backup_codes: backupCodes,
    })
  }

  // Re-verification for already-enabled MFA
  await supabase
    .from("profiles")
    .update({ mfa_enabled: true, mfa_pending: false })
    .eq("id", user.id)

  return NextResponse.json({ success: true, mfa_enabled: true })
})