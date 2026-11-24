import { NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { validateCSRF } from "@/lib/csrf"
import { withErrorBoundary, createAppError } from "@/lib/api-error"
import { generateSamlAuthnRequest, generateRelayState } from "@/lib/saml"
import { z } from "zod"

// GET /api/auth/saml/metadata - return SP metadata for IdP configuration
export const GET = withErrorBoundary(async () => {
  const acsUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/saml/acs`
  const entityId = acsUrl

  const metadata = `<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${entityId}"
  validUntil="2030-01-01T00:00:00Z">
  <md:SPSSODescriptor
    protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${acsUrl}"
      index="1" isDefault="true"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`

  return new NextResponse(metadata, {
    headers: { "Content-Type": "application/samlmetadata+xml" },
  })
})

// POST /api/auth/saml/initiate - start SP-initiated SAML login
const initiateSchema = z.object({
  provider_id: z.string().uuid(),
})

export const POST = withErrorBoundary(async (req) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { provider_id } = initiateSchema.parse(body)

  const { data: provider } = await supabase
    .from("saml_providers")
    .select("*")
    .eq("id", provider_id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single()

  if (!provider) {
    throw createAppError("SAML provider not found", 404, "SAML_PROVIDER_NOT_FOUND")
  }

  const relayState = generateRelayState()
  const acsUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/saml/acs`

  // Store relay state in session for verification (use cookie or temp table)
  // For simplicity, we pass it and verify on ACS via the stored relay_states table
  const { error } = await supabase
    .from("saml_relay_states")
    .insert({
      relay_state: relayState,
      user_id: user.id,
      provider_id,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  const { requestUrl } = generateSamlAuthnRequest({
    provider: provider as any,
    relayState,
    acsUrl,
  })

  return NextResponse.json({ requestUrl, relayState })
})
