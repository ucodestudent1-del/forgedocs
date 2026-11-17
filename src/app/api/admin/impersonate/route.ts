import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { logAuditEvent, getClientIp, getClientUserAgent } from "@/lib/audit"
import { z } from "zod"

const impersonateSchema = z.object({
  target_user_id: z.string().uuid(),
  reason: z.string().min(1).max(500),
  expires_in_minutes: z.number().int().positive().max(480).default(60),
})

export async function POST(req: Request): Promise<NextResponse> {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  try {
    await validateCSRF(req)
  } catch (error) {
    if (error instanceof Error && error.name === "CSRFError") {
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }
    throw error
  }

  const supabase = await (await import("@/lib/supabase")).getRouteClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const parsed = impersonateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { target_user_id, reason, expires_in_minutes } = parsed.data

  // Verify target user exists
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", target_user_id)
    .single()
  if (!targetProfile) {
    return NextResponse.json({ error: "Target user not found" }, { status: 404 })
  }

  // Create impersonation session record
  const expiresAt = new Date(Date.now() + expires_in_minutes * 60 * 1000).toISOString()
  const { data: session, error: sessionError } = await supabase
    .from("user_sessions")
    .insert({
      user_id: target_user_id,
      session_token_hash: "impersonation_" + crypto.randomUUID(),
      ip_address: getClientIp(req) ?? null,
      user_agent: getClientUserAgent(req) ?? null,
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (sessionError) {
    return NextResponse.json({ error: sessionError.message }, { status: 500 })
  }

  // Audit log the impersonation (critical severity)
  await logAuditEvent({
    userId: user.id,
    action: "admin.impersonate",
    entityType: "profiles",
    entityId: target_user_id,
    newValues: { target_email: targetProfile.email, reason, expires_at: expiresAt },
    severity: "critical",
    ipAddress: getClientIp(req),
    userAgent: getClientUserAgent(req),
    details: { impersonation_session_id: session.id },
  })

  return NextResponse.json({
    success: true,
    impersonation_session_id: session.id,
    target_user: {
      id: targetProfile.id,
      email: targetProfile.email,
      full_name: targetProfile.full_name,
    },
    expires_at: expiresAt,
  })
}
