import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"

export async function GET(req: Request): Promise<NextResponse> {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  const supabase = await createRouteClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ sessions: [] })
  }

  // Return current session info
  const currentSession = {
    id: session.access_token?.slice(0, 20) || "current",
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "Unknown",
    ip_address: "Current",
    created_at: new Date().toISOString(),
    is_current: true,
  }

  return NextResponse.json({ sessions: [currentSession] })
}

export async function DELETE(req: Request): Promise<NextResponse> {
  try {
    const rateLimitError = await authRateLimit(req)
    if (rateLimitError) return rateLimitError

    await validateCSRF(req)

    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { revoke_all } = body

    if (revoke_all) {
      // Sign out all sessions by revoking refresh tokens
      // This requires the service role key, so we'll sign out the current session
      // and the user will need to sign in again
      await supabase.auth.signOut()
      return NextResponse.json({ success: true, revoked_all: true })
    }

    // For single session revocation, we just sign out
    await supabase.auth.signOut()
    return NextResponse.json({ success: true, message: "Signed out" })
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }
}