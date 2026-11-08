import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { generateSecret, getTotpUri, generateQrCode, generateBackupCodes, hashBackupCode } from "@/lib/mfa"

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_enabled, mfa_secret")
      .eq("id", user.id)
      .single()

    if (profile?.mfa_enabled) {
      return NextResponse.json({ error: "MFA already enabled" }, { status: 400 })
    }

    const secret = generateSecret()
    const otpUri = getTotpUri(secret, user.email || "")
    const qrCode = await generateQrCode(otpUri)
    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    await supabase
      .from("profiles")
      .update({
        mfa_secret: secret,
        mfa_backup_codes: hashedBackupCodes,
        mfa_enabled: false,
      })
      .eq("id", user.id)

    return NextResponse.json({
      secret,
      qr_code: qrCode,
      backup_codes: backupCodes,
      otp_uri: otpUri,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}