import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { createServiceRoleClient } from "@/lib/supabase"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent } from "@/lib/audit"

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user || authError) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { confirm } = body

  if (confirm !== true) {
    throw createAppError("Account deletion requires explicit confirmation", 400, "CONFIRMATION_REQUIRED")
  }

  const serviceSupabase = await createServiceRoleClient()

  // Audit the deletion before removing data
  await logAuditEvent({
    userId: user.id,
    action: "account.delete",
    entityType: "profiles",
    entityId: user.id,
    newValues: { deleted_at: new Date().toISOString() },
    severity: "high",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  })

  // Delete all user data across tables (RLS bypassed via service role)
  // Order matters for foreign key constraints
  await Promise.all([
    serviceSupabase.from("signature_request_signers").delete().eq("email", user.email ?? ""),
    serviceSupabase.from("signature_requests").delete().eq("user_id", user.id),
    serviceSupabase.from("document_versions").delete().eq("changed_by", user.id),
    serviceSupabase.from("documents").delete().eq("user_id", user.id),
    serviceSupabase.from("activity_logs").delete().eq("user_id", user.id),
    serviceSupabase.from("audit_logs").delete().eq("user_id", user.id),
    serviceSupabase.from("notifications").delete().eq("user_id", user.id),
    serviceSupabase.from("api_keys").delete().eq("user_id", user.id),
    serviceSupabase.from("webhooks").delete().eq("user_id", user.id),
    serviceSupabase.from("usage_tracking").delete().eq("user_id", user.id),
    serviceSupabase.from("subscriptions").delete().eq("user_id", user.id),
    serviceSupabase.from("profiles").delete().eq("id", user.id),
  ])

  // Delete the auth user (cascades to profiles via ON DELETE CASCADE)
  const { error: deleteAuthError } = await serviceSupabase.auth.admin.deleteUser(user.id)

  if (deleteAuthError) {
    throw createAppError(deleteAuthError.message, 500, "DELETION_FAILED")
  }

  return NextResponse.json({
    success: true,
    message: "Account and all associated data have been deleted",
    deleted_at: new Date().toISOString(),
  })
})
