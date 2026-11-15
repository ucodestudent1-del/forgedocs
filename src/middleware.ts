import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale } from "@/i18n/locales"
import { validateCSRF } from "@/lib/csrf"
import { authRateLimit } from "@/lib/rate-limit"

const ADMIN_PATH_PREFIXES = ["/admin"]

function getLocale(request: NextRequest): string {
  const pathname = request.nextUrl.pathname

  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  if (pathnameLocale) {
    return pathnameLocale
  }

  const cookieLocale = request.cookies.get("locale")?.value
  if (cookieLocale && locales.includes(cookieLocale as any)) {
    return cookieLocale
  }

  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
      .find((l) => locales.includes(l as any))
    if (preferred) {
      return preferred
    }
  }

  return defaultLocale
}

async function getProfileLocale(request: NextRequest): Promise<string | null> {
  try {
    // Only query Supabase if there's an auth session cookie
    const hasSessionCookie = request.cookies.get("sb-access-token")?.value ||
      request.cookies.get("sb-refresh-token")?.value
    if (!hasSessionCookie) return null

    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: profile } = await supabase
      .from("profiles")
      .select("language")
      .eq("id", user.id)
      .single()

    if (profile?.language && locales.includes(profile.language as any)) {
      return profile.language
    }
  } catch {
    // Fail closed
  }
  return null
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  )
}

// Simple in-memory cache for admin role checks (per middleware instance)
const adminRoleCache = new Map<string, { role: string | null; expiresAt: number }>()
const ADMIN_CACHE_TTL = 60 * 1000 // 1 minute

async function getCachedAdminRole(supabase: any, userId: string): Promise<string | null> {
  const now = Date.now()
  const cached = adminRoleCache.get(userId)
  if (cached && cached.expiresAt > now) {
    return cached.role
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single()

  const role = profile?.role || null
  adminRoleCache.set(userId, { role, expiresAt: now + ADMIN_CACHE_TTL })
  return role
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel") ||
    pathname.startsWith("/_not-found") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Rate limit auth pages (login, signup, etc.)
  if (pathname.startsWith(`/${defaultLocale}/auth/`) || pathname.startsWith("/auth/")) {
    const rateLimitError = await authRateLimit(request)
    if (rateLimitError) return rateLimitError
  }

  if (isAdminPath(pathname)) {
    const supabase = await createRouteClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = `/${defaultLocale}/auth/login`
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const role = await getCachedAdminRole(supabase, user.id)

    if (!role || !["admin"].includes(role)) {
      const redirectUrl = new URL("/dashboard", request.url)
      // Preserve original query params
      const searchParams = request.nextUrl.searchParams
      if (searchParams.toString()) {
        redirectUrl.search = searchParams.toString()
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  let locale = await getProfileLocale(request)
  if (!locale) {
    locale = getLocale(request)
  }

  const hasLocale = locales.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  )

  // Prevent redirect loops: if we're already on a locale-prefixed path and
  // the locale hasn't changed, don't redirect again
  if (!hasLocale) {
    // Detect loop: if pathname already starts with a locale, don't re-redirect
    const alreadyHasLocale = locales.some(l => pathname.startsWith(`/${l}/`) || pathname === `/${l}`)
    if (!alreadyHasLocale) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${pathname}`
      const response = NextResponse.redirect(url)
      response.cookies.set("locale", locale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "strict",
      })
      return response
    }
  }

  const currentCookie = request.cookies.get("locale")?.value
  if (currentCookie !== locale) {
    const response = NextResponse.next()
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "strict",
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}
