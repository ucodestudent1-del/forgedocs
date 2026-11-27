import { createRouteAuthClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async () => {
  const supabase = await createRouteAuthClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  })

  if (error) {
    throw createAppError(error.message, 400, "OAUTH_ERROR")
  }

  return NextResponse.redirect(data.url)
})
