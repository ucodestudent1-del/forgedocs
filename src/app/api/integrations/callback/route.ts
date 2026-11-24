import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { encryptToken } from "@/lib/integrations"

// GET /api/integrations/callback - OAuth2 callback handler
export const GET = withErrorBoundary(async (req) => {
  const supabase = await getRouteClient()
  const url = new URL(req.url)

  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const error = url.searchParams.get("error")
  const integrationId = url.searchParams.get("integration_id")

  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, url.origin)
    )
  }

  if (!code || !integrationId) {
    throw createAppError("Missing code or integration_id", 400, "MISSING_PARAMS")
  }

  // Exchange code for token (generic — each integration has its own token endpoint)
  // This is a placeholder that stores the code; real integrations call their token endpoint
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  // Store the authorization code (encrypted) — in production, exchange for access token
  const { data, error: dbError } = await supabase
    .from("user_integrations")
    .update({
      access_token_encrypted: encryptToken(code),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("integration_id", integrationId)
    .select()
    .single()

  if (dbError || !data) {
    throw createAppError("Failed to store integration token", 500, "DATABASE_ERROR")
  }

  return NextResponse.redirect(new URL(`/dashboard/integrations?connected=${integrationId}`, url.origin))
})
