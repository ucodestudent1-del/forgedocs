import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { validatePassword } from "@/lib/auth"
import { sendEmail } from "@/lib/email"
import { getPasswordChangedHtml } from "@/lib/emailTemplates"

const resetSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be less than 128 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
})

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const body = await req.json()
    const { password } = resetSchema.parse(body)

    const pwValidation = validatePassword(password)
    if (!pwValidation.valid) {
      return NextResponse.json({ error: pwValidation.errors.join(", ") }, { status: 400 })
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Invalidate all existing sessions after password change
    await supabase.auth.signOut()

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