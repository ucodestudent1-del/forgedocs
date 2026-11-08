import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { verifyToken } from "@/lib/mfa"

const verifySchema = z.object({
  token: z.string().length(6, "Token must be 6 digits"),
  secret: z.string().optional(),
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
    const { token, secret } = verifySchema.parse(body)

    const { data: profile } = await supabase
      .from("profiles")
      .select("mfa_secret, mfa_enabled")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const mfaSecret = secret || profile.mfa_secret

    if (!mfaSecret) {
      return NextResponse.json({ error: "MFA not set up" }, { status: 400 })
    }

    const isValid = verifyToken(mfaSecret, token)

    if (!isValid) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    if (!profile.mfa_enabled) {
      await supabase
        .from("profiles")
        .update({ mfa_enabled: true })
        .eq("id", user.id)
    }

    return NextResponse.json({ success: true, mfa_enabled: true })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}