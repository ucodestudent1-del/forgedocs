import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const resendSchema = z.object({
  email: z.string().email("Invalid email address"),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const body = await req.json()
  const { email } = resendSchema.parse(body)

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  })

  if (error) {
    throw createAppError(error.message, 400, "RESEND_VERIFICATION_ERROR")
  }

  return NextResponse.json({ success: true, message: "Verification email sent" })
})