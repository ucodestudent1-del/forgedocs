import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { validatePassword } from "@/lib/password"

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await getRouteClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (profileError) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 })
  }

  return NextResponse.json({ user, profile })
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await getRouteClient()
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

    return NextResponse.json({ user: data.user })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}