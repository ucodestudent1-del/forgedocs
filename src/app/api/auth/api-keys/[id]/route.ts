import { getRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { revokeApiKey } from "@/lib/api-key"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const revokeApiKeySchema = z.object({
  key_id: z.string().uuid(),
})

export const DELETE = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await getRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const parsed = revokeApiKeySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const result = await revokeApiKey(user.id, parsed.data.key_id)
  if (!result.success) {
    throw createAppError(result.error || "Unknown error", 500, "API_KEY_REVOKE_ERROR")
  }

  return NextResponse.json({ success: true })
})
