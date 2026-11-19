import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { createServiceRoleClient } from "@/lib/supabase"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { logAuditEvent } from "@/lib/audit"

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const serviceSupabase = await createServiceRoleClient()

  // Export all user data across all tables
  const [profile, documents, documentVersions, signatureRequests, signatureSigners, activityLogs, auditLogs, notifications, apiKeys, webhooks, usageTracking, subscriptions] =
    await Promise.all([
      serviceSupabase.from("profiles").select("*").eq("id", user.id).single(),
      serviceSupabase.from("documents").select("*").eq("user_id", user.id),
      serviceSupabase.from("document_versions").select("*").eq("changed_by", user.id),
      serviceSupabase.from("signature_requests").select("*").eq("user_id", user.id),
      serviceSupabase.from("signature_request_signers").select("*").eq("email", user.email ?? ""),
      serviceSupabase.from("activity_logs").select("*").eq("user_id", user.id),
      serviceSupabase.from("audit_logs").select("*").eq("user_id", user.id),
      serviceSupabase.from("notifications").select("*").eq("user_id", user.id),
      serviceSupabase.from("api_keys").select("id, name, key_prefix, permissions, last_used_at, expires_at, revoked_at, created_at").eq("user_id", user.id),
      serviceSupabase.from("webhooks").select("*").eq("user_id", user.id),
      serviceSupabase.from("usage_tracking").select("*").eq("user_id", user.id),
      serviceSupabase.from("subscriptions").select("*").eq("user_id", user.id),
    ])

  const exportData = {
    exported_at: new Date().toISOString(),
    user_id: user.id,
    profile: profile.data ?? null,
    documents: documents.data ?? [],
    document_versions: documentVersions.data ?? [],
    signature_requests: signatureRequests.data ?? [],
    signature_request_signers: signatureSigners.data ?? [],
    activity_logs: activityLogs.data ?? [],
    audit_logs: auditLogs.data ?? [],
    notifications: notifications.data ?? [],
    api_keys: apiKeys.data ?? [],
    webhooks: webhooks.data ?? [],
    usage_tracking: usageTracking.data ?? [],
    subscriptions: subscriptions.data ?? [],
  }

  // Audit the data export
  await logAuditEvent({
    userId: user.id,
    action: "data.export",
    entityType: "profiles",
    entityId: user.id,
    newValues: { exported_at: exportData.exported_at },
    severity: "medium",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  })

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="forgedocs-data-export-${user.id}.json"`,
      "Content-Type": "application/json",
    },
  })
})
