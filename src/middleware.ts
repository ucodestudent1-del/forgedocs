import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import nextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { createRouteClient } from "@/lib/supabase"

const intlMiddleware = nextIntlMiddleware(routing)

const ADMIN_PATH_PREFIXES = ["/en/admin", "/es/admin", "/ar/admin", "/fr/admin", "/de/admin", "/ja/admin", "/zh/admin", "/admin"]

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Skip API, static assets, and internal Next.js routes
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/_not-found") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Run next-intl middleware first (locale detection / redirect)
  const intlResponse = intlMiddleware(request)
  if (intlResponse.status !== 200) {
    return intlResponse
  }

  // Admin route protection - runs after locale is established
  if (isAdminPath(pathname)) {
    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/en/auth/login"
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin"].includes(profile.role)) {
      return NextResponse.redirect(new URL("/en/dashboard", request.url))
    }
  }

  return intlResponse
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}