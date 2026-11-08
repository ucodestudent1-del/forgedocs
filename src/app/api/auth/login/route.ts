import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { checkLoginAttempts, recordFailedAttempt, clearFailedAttempts, validatePassword } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    const rateLimitError = authRateLimit(req)
    if (rateLimitError) return rateLimitError

    validateCSRF(req)

    const identifier = getClientIdentifier(req)
    const attemptCheck = checkLoginAttempts(identifier)
    if (!attemptCheck.allowed) {
      return NextResponse.json(
        { error: `Account locked. Try again in ${Math.ceil(attemptCheck.remainingMs! / 1000 / 60)} minute(s).` },
        { status: 429 }
      )
    }

    const supabase = getRouteClient()
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
      recordFailedAttempt(identifier)
      return NextResponse.json({ error: "Invalid email or password" }, { status: 400 })
    }

    clearFailedAttempts(identifier)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}

export async function DELETE(req: Request) {
  try {
    const rateLimitError = authRateLimit(req)
    if (rateLimitError) return rateLimitError

    validateCSRF(req)

    const supabase = getRouteClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}

function getClientIdentifier(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown"
  return ip
}