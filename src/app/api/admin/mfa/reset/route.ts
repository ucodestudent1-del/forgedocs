import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { adminResetMfa } from "@/lib/mfa-recovery"
import { getRouteClient } from "@/lib/supabase"
import { createAppError, withErrorBoundary } from "@/lib/api-error"
import { logAuditEvent } from "@/lib/audit"

const resetSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Only admins can reset MFA for other users
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "admin") {
    throw createAppError("Admin access required", 403, "FORBIDDEN")
  }

  const body = await req.json()
  const { userId } = resetSchema.parse(body)

  // Prevent self-reset via admin endpoint (use /mfa/disable instead)
  if (userId === user.id) {
    throw createAppError("Use /auth/mfa/disable to reset your own MFA", 400, "SELF_RESET_NOT_ALLOWED")
  }

  await adminResetMfa(userId, user.id)

  await logAuditEvent({
    userId: user.id,
    action: "admin.mfa.reset",
    entityType: "profiles",
    entityId: userId,
    newValues: { mfa_enabled: false, mfa_secret: null, mfa_backup_codes: null, mfa_pending: false },
    severity: "high",
    ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: req.headers.get("user-agent") ?? null,
  })

  return NextResponse.json({ success: true, mfa_enabled: false })
})
