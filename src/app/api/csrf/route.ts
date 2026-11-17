import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { withErrorBoundary, createAppError } from "@/lib/api-error"

export const GET = withErrorBoundary(async (req: Request) => {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw createAppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  const token = randomUUID()

  const response = NextResponse.json({ csrf_token: token })
  response.cookies.set("csrf_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  })

  return response
})
