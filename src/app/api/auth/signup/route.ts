import { createRouteAuthClient, createServiceRoleClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { validatePassword } from "@/lib/password"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { sendEmail } from "@/lib/email"
import { getWelcomeEmailHtml } from "@/lib/emailTemplates"
import logger from "@/lib/logger"
import { z } from "zod"

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
  full_name: z.string().optional(),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteAuthClient()
  const body = await req.json()
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, password, full_name } = parsed.data

  logger.info("[AUTH SIGNUP] initiated", { email })

  // Validate password using shared schema
  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) {
    return NextResponse.json({ error: pwValidation.errors.join(", ") }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/callback?callbackUrl=${encodeURIComponent("/dashboard")}`,
    },
  })

  if (error) {
    logger.error("[AUTH SIGNUP] signUp failed", { email, error: error.message, code: (error as any)?.code })
    throw createAppError(error.message, 400, "SIGNUP_ERROR")
  }

  logger.info("[AUTH SIGNUP] signUp succeeded", { email, userId: data?.user?.id, emailConfirmed: Boolean(data?.user?.email_confirmed_at) })

  // Create user profile if signup successful.
  // Use the service role client so profile creation is not blocked by RLS
  // (no authenticated session exists yet during signup).
  if (data.user) {
    const serviceSupabase = await createServiceRoleClient()
    const { error: profileError } = await (serviceSupabase.from("profiles") as any).insert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || null,
    })

    if (profileError) {
      logger.error("Failed to create profile:", { error: profileError })
    }

    // Send welcome email (non-blocking — failure must not break signup)
    void sendEmail({
      to: data.user.email!,
      subject: "Welcome to ForgeDocs - Your account is ready",
      html: getWelcomeEmailHtml(full_name || "User", `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`),
    }).catch((err) => {
      logger.error("[AUTH SIGNUP] welcome email failed", { email: data.user?.email, error: err instanceof Error ? err.message : String(err) })
    })
  }

  await rotateCSRFToken()

  return NextResponse.json(
    { user: data.user, message: "Please check your email to verify your account" },
    { status: 201 }
  )
})
