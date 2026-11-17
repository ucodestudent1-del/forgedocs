import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { getPasswordResetHtml } from "@/lib/emailTemplates"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const forgotSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const body = await req.json()
  const { email } = forgotSchema.parse(body)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
  })

  // Always return success to prevent account enumeration
  return NextResponse.json({
    success: true,
    message: "If an account exists, a password reset link has been sent",
  })
})