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

  // Delete the auth user first so dependent data can be cleaned up.
  // Profiles cascade via ON DELETE CASCADE.
  const { error: deleteAuthError } = await serviceSupabase.auth.admin.deleteUser(user.id)

  if (deleteAuthError) {
    throw createAppError(deleteAuthError.message, 500, "DELETION_FAILED")
  }

  // Anonymize audit logs (preserve for SOC 2 compliance) instead of destroying them.
  // user_id is nullable, so nulling it breaks the link to the deleted user.
  await (serviceSupabase.from("audit_logs") as any)
    .update({ user_id: null })
    .eq("user_id", user.id)

  // Delete remaining user-owned data after auth user removal
  await Promise.all([
    serviceSupabase.from("signature_request_signers").delete().eq("email", user.email ?? ""),
    serviceSupabase.from("signature_requests").delete().eq("user_id", user.id),
    serviceSupabase.from("document_versions").delete().eq("changed_by", user.id),
    serviceSupabase.from("documents").delete().eq("user_id", user.id),
    serviceSupabase.from("activity_logs").delete().eq("user_id", user.id),
    serviceSupabase.from("notifications").delete().eq("user_id", user.id),
    serviceSupabase.from("api_keys").delete().eq("user_id", user.id),
    serviceSupabase.from("webhooks").delete().eq("user_id", user.id),
    serviceSupabase.from("usage_tracking").delete().eq("user_id", user.id),
    serviceSupabase.from("subscriptions").delete().eq("user_id", user.id),
  ])

  return NextResponse.json({
    success: true,
    message: "Account and all associated data have been deleted",
    deleted_at: new Date().toISOString(),
  })
})
