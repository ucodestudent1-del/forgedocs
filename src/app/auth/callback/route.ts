import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import logger from "@/lib/logger"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? searchParams.get("callbackUrl") ?? "/dashboard"

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
                secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
                sameSite: options.sameSite ?? "lax",
              })
            )
          } catch (err) {
            logger.error("[AUTH CALLBACK] setAll cookie failed", { error: err instanceof Error ? err.message : String(err) })
          }
        },
      },
    }
  )

  logger.info("[AUTH CALLBACK] received", { hasCode: Boolean(code), hasTokenHash: Boolean(tokenHash), type, next, url: request.url })

  // --- PKCE authorization code flow (email confirm / sign-in via link) ---
  if (code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data?.session) {
      logger.error("[AUTH CALLBACK] exchangeCodeForSession failed", { error: error?.message, code: (error as any)?.code, status: (error as any)?.status, url: request.url })
      return NextResponse.redirect(`/auth/login?error=Could not authenticate user&callbackUrl=${encodeURIComponent(next)}`)
    }

    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      logger.error("[AUTH CALLBACK] getUser failed after exchange", { error: userError?.message, url: request.url })
      return NextResponse.redirect(`/auth/login?error=Could not authenticate user&callbackUrl=${encodeURIComponent(next)}`)
    }

    logger.info("[AUTH CALLBACK] session established", { userId: userData.user.id, emailConfirmed: Boolean(userData.user.email_confirmed_at), url: request.url })

    if (userData.user.email_confirmed_at) {
      return NextResponse.redirect(next)
    }
    // Email not yet confirmed — send to verify page so the user can complete confirmation.
    return NextResponse.redirect(`/auth/verify?callbackUrl=${encodeURIComponent(next)}`)
  }

  // --- Token-hash verification flow (verifyOtp) ---
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      logger.error("[AUTH CALLBACK] verifyOtp failed", { error: error.message, code: (error as any)?.code, status: (error as any)?.status })
      return NextResponse.redirect(`/auth/login?error=Could not authenticate user&callbackUrl=${encodeURIComponent(next)}`)
    }

    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData?.session) {
      logger.error("[AUTH CALLBACK] no session after verifyOtp", { url: request.url })
      return NextResponse.redirect(`/auth/login?error=Could not authenticate user&callbackUrl=${encodeURIComponent(next)}`)
    }

    const { data: userData } = await supabase.auth.getUser()
    logger.info("[AUTH CALLBACK] token_hash verification succeeded", { userId: userData?.user?.id, emailConfirmed: Boolean(userData?.user?.email_confirmed_at), url: request.url })

    if (userData?.user?.email_confirmed_at) {
      return NextResponse.redirect(next)
    }
    return NextResponse.redirect(`/auth/verify?callbackUrl=${encodeURIComponent(next)}`)
  }

  return NextResponse.redirect(`/auth/login?error=Could not authenticate user&callbackUrl=${encodeURIComponent(next)}`)
}
