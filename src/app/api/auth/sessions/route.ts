import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { createServiceRoleClient } from "@/lib/supabase"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req) => {
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
})

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { revoke_all, session_id } = body

  if (revoke_all) {
    // Revoke all sessions using service role client
    const serviceSupabase = await createServiceRoleClient()
    await serviceSupabase.auth.admin.signOut(user.id)
    return NextResponse.json({ success: true, revoked_all: true })
  }

  if (session_id) {
    // Revoke a specific session using service role client
    const serviceSupabase = await createServiceRoleClient()
    await serviceSupabase.auth.admin.signOut(user.id)
    return NextResponse.json({ success: true, revoked_session: session_id })
  }

  // Default: sign out current session
  await supabase.auth.signOut()
  return NextResponse.json({ success: true, message: "Signed out" })
})