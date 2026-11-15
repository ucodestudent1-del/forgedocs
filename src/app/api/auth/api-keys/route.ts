import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"
import { z } from "zod"
import { createApiKey, listApiKeys } from "@/lib/api-key"

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.record(z.string(), z.boolean()).optional(),
  expires_in_days: z.number().int().positive().max(365).optional(),
})

export async function GET(req: Request): Promise<NextResponse> {
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

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const keys = await listApiKeys(user.id)
  return NextResponse.json({ api_keys: keys })
}

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

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createApiKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const { name, permissions, expires_in_days } = parsed.data
  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null

  const result = await createApiKey(user.id, name, permissions ?? {}, expiresAt)
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Return raw key only once
  return NextResponse.json({ api_key: result.key, raw_key: result.rawKey }, { status: 201 })
}
