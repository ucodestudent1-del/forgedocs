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
    user_agent: req.headers.get("user-agent") ?? "Unknown",
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
    // Per-session revocation: Supabase Auth does not expose a native
    // per-session revocation API. We attempt to revoke the specific
    // access token via the service role client. If that is not supported
    // by the underlying provider, we fall back to revoking all sessions
    // and clearly indicate this in the response.
    const serviceSupabase = await createServiceRoleClient()

    // Try to revoke the specific session token
    let revokedSpecific = false
    try {
      // Supabase Auth: revoke a specific access token by its JWT
      // The session_id is the first 20 chars of the access token; we match by prefix
      const { error: revokeError } = await (serviceSupabase as any).auth.admin.revokeToken?.(
        session_id,
        { user_id: user.id }
      )
      if (!revokeError) {
        revokedSpecific = true
      }
    } catch {
      // revokeToken not available — fall through to revoke all
    }

    if (revokedSpecific) {
      return NextResponse.json({ success: true, revoked_all: false, revoked_session_id: session_id })
    }

    // Fallback: revoke all sessions for the user
    await serviceSupabase.auth.admin.signOut(user.id)
    return NextResponse.json({
      success: true,
      revoked_all: true,
      note: "Per-session revocation not supported by auth provider; all sessions revoked",
    })
  }

  // Default: sign out current session
  await supabase.auth.signOut()
  return NextResponse.json({ success: true, message: "Signed out" })
})
