import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { checkLoginAttempts, recordFailedAttempt, clearFailedAttempts } from "@/lib/auth"
import { validatePassword } from "@/lib/password"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { getClientIdentifier } from "@/lib/client-identifier"
import logger from "@/lib/logger"

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const identifier = getClientIdentifier(req)
  const attemptCheck = await checkLoginAttempts(identifier)
  if (!attemptCheck.allowed) {
    return NextResponse.json(
      { error: `Account locked. Try again in ${Math.ceil(attemptCheck.remainingMs! / 1000 / 60)} minute(s).` },
      { status: 429 }
    )
  }

  const supabase = await getPooledRouteClient()
  const { email, password } = await req.json()

  // Validate password format
  const pwValidation = validatePassword(password)
  if (!pwValidation.valid) {
    return NextResponse.json({ error: pwValidation.errors.join(", ") }, { status: 400 })
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    await recordFailedAttempt(identifier)
    const code = (error as any)?.code || (error as any)?.error_code
    const message = String((error as any)?.message || (error as any)?.msg || error)
    const isUnconfirmed =
      message.toLowerCase().includes("confirm") ||
      code === "email_not_confirmed"
    logger.error("Supabase signInWithPassword failed", {
      email,
      code,
      message,
      status: (error as any)?.status,
    })
    throw createAppError(
      isUnconfirmed ? "Please verify your email before signing in. Check your inbox." : "Invalid email or password",
      400,
      isUnconfirmed ? "EMAIL_NOT_CONFIRMED" : "INVALID_CREDENTIALS"
    )
  }

  await clearFailedAttempts(identifier)

  // Check if MFA is enabled for this user
  const { data: mfa } = await supabase
    .from("mfa_profiles")
    .select("enabled")
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
    .single()

  if (mfa?.enabled) {
    // MFA required — return a challenge that the user must complete
    const { data: { user } } = await supabase.auth.getUser()
    // Set a temporary mfa_required flag in session
    const cookieStore = await cookies()
    cookieStore.set("mfa_required", user.id, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 600, // 10 minutes to complete MFA
    })

    return NextResponse.json({
      mfa_required: true,
      message: "MFA verification required",
    }, { status: 200 })
  }

  // Rotate CSRF token after successful authentication to prevent session fixation
  await rotateCSRFToken()

  return NextResponse.json({ success: true })
})

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw createAppError(error.message, 400, "LOGOUT_ERROR")
  }

  await rotateCSRFToken()

  return NextResponse.json({ success: true })
})
