import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: () => cookieStore }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Auth routes
  if (req.nextUrl.pathname.startsWith("/auth")) {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }
    return res
  }

  // Protected routes
  if (
    req.nextUrl.pathname.startsWith("/dashboard") ||
    req.nextUrl.pathname.startsWith("/editor") ||
    req.nextUrl.pathname.startsWith("/conversion") ||
    req.nextUrl.pathname.startsWith("/billing")
  ) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", req.nextUrl))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)"],
}
