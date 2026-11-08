import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { verifyToken, generateBackupCodes, hashBackupCode } from "@/lib/mfa"

const backupCodesSchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
})

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

    const body = await req.json()
    const { token } = backupCodesSchema.parse(body)

    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_secret, mfa_enabled")
      .eq("id", user.id)
      .single()

    if (!profile || !profile.mfa_enabled) {
      return NextResponse.json({ error: "MFA not enabled" }, { status: 400 })
    }

    const isValid = verifyToken(profile.mfa_secret!, token)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    const backupCodes = generateBackupCodes(10)
    const hashedBackupCodes = backupCodes.map(hashBackupCode)

    await supabase
      .from("profiles")
      .update({ mfa_backup_codes: hashedBackupCodes })
      .eq("id", user.id)

    return NextResponse.json({ backup_codes: backupCodes })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}