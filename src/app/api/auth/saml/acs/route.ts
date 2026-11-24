import { NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { cookies } from "next/headers"
import { generateCSRFToken } from "@/lib/csrf"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { parseSamlResponse } from "@/lib/saml"
import { z } from "zod"

const acsSchema = z.object({
  SAMLResponse: z.string(),
  RelayState: z.string().optional(),
})

// POST /api/auth/saml/acs - SAML Assertion Consumer Service
export const POST = withErrorBoundary(async (req) => {
  const body = await req.formData()
  const samlResponse = body.get("SAMLResponse") as string
  const relayState = body.get("RelayState") as string | undefined

  if (!samlResponse) {
    throw createAppError("Missing SAMLResponse", 400, "MISSING_SAML_RESPONSE")
  }

  const supabase = await getRouteClient()

  // Verify relay state if present
  if (relayState) {
    const { data: relay } = await supabase
      .from("saml_relay_states")
      .select("*, saml_providers ( * )")
      .eq("relay_state", relayState)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (!relay || new Date(relay.expires_at) < new Date()) {
      throw createAppError("Invalid or expired relay state", 400, "INVALID_RELAY_STATE")
    }

    // Delete used relay state
    await supabase.from("saml_relay_states").delete().eq("relay_state", relayState)

    const provider = (relay as any).saml_providers
    const parsed = parseSamlResponse(samlResponse, provider as any, relayState)

    // Link or create user via SAML account
    const { data: existingAccount } = await supabase
      .from("saml_accounts")
      .select("user_id")
      .eq("provider_id", provider.id)
      .eq("external_id", parsed.nameId)
      .single()

    let userId: string
    if (existingAccount) {
      userId = existingAccount.user_id
    } else {
      // Create/sign-in the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
        provider: "saml",
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
        },
      })
      if (authError) throw createAppError(authError.message, 500, "AUTH_ERROR")
      userId = authData.user?.id ?? ""
    }

    // Set session cookie
    const cookieStore = await cookies()
    const newCsrfToken = generateCSRFToken()
    cookieStore.set("csrf_token", newCsrfToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
    })

    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // IdP-initiated: find user by email from parsed response
  // We need the provider to parse; look up by the response's issuer
  const parsed = parseSamlResponse(samlResponse, {
    id: "",
    entityId: "",
    ssoUrl: "",
    x509Certificate: "",
  } as any)

  const { data: account } = await supabase
    .from("saml_accounts")
    .select("user_id, provider_id")
    .eq("email", parsed.email)
    .single()

  if (!account) {
    throw createAppError("No SAML account linked to this email", 403, "SAML_ACCOUNT_NOT_LINKED")
  }

  const cookieStore = await cookies()
  const newCsrfToken = generateCSRFToken()
  cookieStore.set("csrf_token", newCsrfToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  })

  return NextResponse.redirect(new URL("/dashboard", req.url))
})
