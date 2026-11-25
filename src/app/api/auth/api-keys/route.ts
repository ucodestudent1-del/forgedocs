import { getPooledRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF, rotateCSRFToken } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { createApiKey, listApiKeys } from "@/lib/api-key"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.record(z.string(), z.boolean()).optional(),
  expires_in_days: z.number().int().positive().max(365).optional(),
})

export const GET = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const keys = await listApiKeys(user.id)
  return NextResponse.json({ api_keys: keys })
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getPooledRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
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
    throw createAppError(result.error, 500, "API_KEY_CREATE_ERROR")
  }

  await rotateCSRFToken()

  // Return raw key only once
  return NextResponse.json({ api_key: result.key, raw_key: result.rawKey }, { status: 201 })
})
