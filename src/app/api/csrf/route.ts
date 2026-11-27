import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req: Request) => {
  const supabase = await createRouteAuthClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const token = randomUUID()

  const response = NextResponse.json({ csrf_token: token })
  response.cookies.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  })

  return response
})
