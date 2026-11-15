import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { validatePassword } from "@/lib/password"
import { sendEmail } from "@/lib/email"
import { getPasswordChangedHtml } from "@/lib/emailTemplates"

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const body = await req.json()
    const { password } = body

    // Validate password using shared schema
    const pwValidation = validatePassword(password)
    if (!pwValidation.valid) {
      return NextResponse.json({ error: pwValidation.errors.join(", ") }, { status: 400 })
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Note: We intentionally do NOT call signOut() here. The user's current
    // session remains valid since they just authenticated to change their password.
    // Other devices with valid refresh tokens will continue to work until their
    // tokens expire or are explicitly revoked.

    const { data: { user } } = await supabase.auth.getUser()
    if (user?.email) {
      await sendEmail({
        to: user.email,
        subject: "Your ForgeDocs password was changed",
        html: getPasswordChangedHtml(user.user_metadata?.full_name || "User", `${process.env.NEXT_PUBLIC_APP_URL}/auth/login`),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}