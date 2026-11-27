import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { redirect } from "next/navigation"
import logger from "@/lib/logger"

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const code = params["code"]
  const next = (params["next"] ?? params["callbackUrl"] ?? "/dashboard") as string
  const tokenHash = params["token_hash"]
  const type = params["type"]

  if (Array.isArray(code)) return redirect("/auth/login?error=Could not authenticate user")
  if (Array.isArray(tokenHash)) return redirect("/auth/login?error=Could not authenticate user")
  if (Array.isArray(type)) return redirect("/auth/login?error=Could not authenticate user")

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
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, {
                  ...options,
                  secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") ?? false,
                  sameSite: (options?.sameSite ?? "lax") as "lax" | "strict" | "none" | undefined,
                })
              })
            } catch {
              // The `set` method was called from a Server Component.
            }
          },
        },
      }
    )

    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.session) {
      const { data: userData } = await supabase.auth.getUser()
      logger.info("[AUTH VERIFY PAGE] code exchanged", { userId: userData?.user?.id, emailConfirmed: Boolean(userData?.user?.email_confirmed_at) })
      if (userData?.user?.email_confirmed_at) {
        redirect(next)
      }
      redirect(`/verify-email?callbackUrl=${encodeURIComponent(next)}`)
    }
    logger.error("[AUTH VERIFY PAGE] exchangeCodeForSession failed", { error: error?.message })
    redirect("/auth/login?error=Could not authenticate user")
  }

  if (tokenHash && type) {
    // Delegate token-hash verification to the client page which calls verifyOtp
    // and establishes the browser session.
    redirect(`/verify-email?token_hash=${tokenHash}&type=${type}&callbackUrl=${encodeURIComponent(next)}`)
  }

  redirect("/verify-email")
}
