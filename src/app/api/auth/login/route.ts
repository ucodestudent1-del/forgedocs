import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { validateCSRF, generateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { checkLoginAttempts, recordFailedAttempt, clearFailedAttempts } from "@/lib/auth"
import { validatePassword } from "@/lib/password"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { getClientIdentifier } from "@/lib/client-identifier"

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

  const supabase = await getRouteClient()
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
    throw createAppError("Invalid email or password", 400, "INVALID_CREDENTIALS")
  }

  await clearFailedAttempts(identifier)

  // Rotate CSRF token after successful authentication to prevent session fixation
  const newCsrfToken = generateCSRFToken()
  const cookieStore = await cookies()
  cookieStore.set("csrf_token", newCsrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  })

  return NextResponse.json({ success: true })
})

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw createAppError(error.message, 400, "LOGOUT_ERROR")
  }

  return NextResponse.json({ success: true })
})