import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/dashboard"

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, {
                  ...options,
                  secure: true,
                  sameSite: options.sameSite ?? "lax",
                })
              )
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.session) {
      // Confirm the user is fully verified before sending them to the app.
      // Unverified users are routed to the verify page so they can complete
      // email confirmation instead of landing on a broken dashboard.
      const { data: userData } = await supabase.auth.getUser()
      if (userData?.user?.email_confirmed_at) {
        return NextResponse.redirect(next)
      }
      return NextResponse.redirect("/auth/verify")
    }
  }

  return NextResponse.redirect("/auth/login?error=Could not authenticate user")
}
