import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { INTEGRATION_CATALOG, getIntegration } from "@/lib/integrations"

// GET /api/integrations - list available integrations + user's connected ones
export const GET = withErrorBoundary(async (req) => {
  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  const url = new URL(req.url)
  const includeInstalled = url.searchParams.get("include_installed") === "true"

  const catalog = INTEGRATION_CATALOG.map((i) => ({
    id: i.id,
    name: i.name,
    description: i.description,
    auth_type: i.auth_type,
    capabilities: i.capabilities,
  }))

  let installed: any[] = []
  if (includeInstalled && user) {
    const { data } = await supabase
      .from("user_integrations")
      .select("id, integration_id, scopes, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
    installed = data ?? []
  }

  return NextResponse.json({ catalog, installed })
})

// POST /api/integrations/connect - initiate OAuth connection
export const POST = withErrorBoundary(async (req) => {
  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { integration_id, redirect_uri } = body

  if (!integration_id || !redirect_uri) {
    throw createAppError("integration_id and redirect_uri are required", 400, "MISSING_PARAMS")
  }

  const integration = getIntegration(integration_id)
  if (!integration) {
    throw createAppError("Integration not found", 404, "INTEGRATION_NOT_FOUND")
  }

  if (integration.auth_type !== "oauth2" || !integration.oauth) {
    throw createAppError("Integration does not support OAuth2", 400, "INVALID_AUTH_TYPE")
  }

  const state = require("crypto").randomBytes(16).toString("hex")
  const codeVerifier = require("crypto").randomBytes(32).toString("base64url")

  // Store state + code_verifier temporarily (use a short-lived cache/DB)
  const { error } = await supabase
    .from("user_integrations")
    .insert({
      user_id: user.id,
      integration_id,
      access_token_encrypted: null,
      refresh_token_encrypted: null,
      scopes: [],
    })
    .select("id")
    .single()

  if (error) {
    // Ignore if already exists; we just need a placeholder row
  }

  const params = new URLSearchParams({
    client_id: integration.oauth.client_id,
    redirect_uri,
    scope: integration.oauth.scope,
    response_type: "code",
    state,
  })

  const authorizeUrl = `${integration.oauth.authorization_url}?${params.toString()}`

  return NextResponse.json({ authorizeUrl, state, codeVerifier })
})
