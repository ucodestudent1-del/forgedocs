import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { validatePassword } from "@/lib/password"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
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

  const supabase = await getPooledRouteClient()
  const body = await req.json()
  const parsed = signupSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { email, password, full_name } = parsed.data

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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify?callbackUrl=${encodeURIComponent("/dashboard")}`,
    },
  })

  if (error) {
    throw createAppError(error.message, 400, "SIGNUP_ERROR")
  }

  // Create user profile if signup successful
  if (data.user) {
    const { error: profileError } = await supabase.from("profiles").insert({
      id: data.user.id,
      email: data.user.email,
      full_name: data.user.user_metadata?.full_name || null,
    })

    if (profileError) {
      logger.error("Failed to create profile:", { error: profileError })
    }
  }

  await rotateCSRFToken()

  return NextResponse.json(
    { user: data.user, message: "Please check your email to verify your account" },
    { status: 201 }
  )
})
