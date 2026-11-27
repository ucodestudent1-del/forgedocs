import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { validatePassword } from "@/lib/password"
import { sendEmail } from "@/lib/email"
import { getPasswordChangedHtml } from "@/lib/emailTemplates"
import { createServiceRoleClient } from "@/lib/supabase"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const POST = withErrorBoundary(async (req) => {
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
    throw createAppError(error.message, 400, "PASSWORD_UPDATE_ERROR")
  }

  // Invalidate all existing sessions after password change
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const serviceSupabase = await createServiceRoleClient()
    await serviceSupabase.auth.admin.signOut(user.id)
  }

  if (user?.email) {
    await sendEmail({
      to: user.email,
      subject: "Your ForgeDocs password was changed",
      html: getPasswordChangedHtml(user.user_metadata?.full_name || "User", `${process.env.NEXT_PUBLIC_APP_URL}/login`),
    })
  }

  await rotateCSRFToken()

  return NextResponse.json({ success: true })
})
