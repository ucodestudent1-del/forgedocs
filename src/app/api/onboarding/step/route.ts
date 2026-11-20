import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limiter"
import { z } from "zod"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

const stepSchema = z.object({
  step: z.number().min(1).max(5),
})

export const POST = withErrorBoundary(async (req) => {
  const rateLimitError = await authRateLimit(req)
  if (rateLimitError) return rateLimitError

  await validateCSRF(req)

  const supabase = await createRouteClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const body = await req.json()
  const { step } = stepSchema.parse(body)

  // Enforce sequential onboarding: a user may only advance to the next step
  // (or revisit an earlier one), never skip ahead.
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_step")
    .eq("id", user.id)
    .single()

  const currentStep = profile?.onboarding_step ?? 0
  if (step > currentStep + 1) {
    return NextResponse.json({ error: "Cannot skip onboarding steps" }, { status: 400 })
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_step: step })
    .eq("id", user.id)

  if (error) {
    throw createAppError(error.message, 500, "DATABASE_ERROR")
  }

  return NextResponse.json({ success: true, step })
})