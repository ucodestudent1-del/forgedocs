import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, CSRFError } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { validatePassword } from "@/lib/password"

export async function POST(req: Request) {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const body = await req.json()

    const { email, password, full_name } = body

    // Validate email
    if (!email || !String(email).includes("@")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Validate password using shared schema
    const pwValidation = validatePassword(password)
    if (!pwValidation.valid) {
      return NextResponse.json({ error: pwValidation.errors.join(", ") }, { status: 400 })
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name } },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create user profile if signup successful
    if (data.user) {
      const { error: profileError } = await (supabase as any).from("profiles").insert({
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name || null,
      })

      if (profileError) {
        console.error("Failed to create profile:", profileError)
      }
    }

    return NextResponse.json(
      { user: data.user, message: "Please check your email to verify your account" },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof CSRFError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    throw error
  }
}
