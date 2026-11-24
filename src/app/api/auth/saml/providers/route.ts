import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const providerSchema = z.object({
  entity_id: z.string().min(1),
  sso_url: z.string().url(),
  x509_certificate: z.string().min(1),
  name_id_format: z.string().optional(),
  attribute_mapping: z.record(z.string(), z.string()).optional(),
  is_active: z.boolean().optional(),
})

// GET /api/auth/saml/providers - list user's SAML providers
export const GET = withErrorBoundary(async (req) => {
  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const { data: providers, error } = await supabase
    .from("saml_providers")
    .select("id, entity_id, sso_url, name_id_format, attribute_mapping, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ providers: providers ?? [] })
})

// POST /api/auth/saml/providers - create a SAML provider
export const POST = withErrorBoundary(async (req) => {
  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { entity_id, sso_url, x509_certificate, name_id_format, attribute_mapping, is_active } = providerSchema.parse(body)

  const { data, error } = await supabase
    .from("saml_providers")
    .insert({
      user_id: user.id,
      entity_id,
      sso_url,
      x509_certificate,
      name_id_format: name_id_format ?? null,
      attribute_mapping: attribute_mapping ?? {},
      is_active: is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ provider: data }, { status: 201 })
})
