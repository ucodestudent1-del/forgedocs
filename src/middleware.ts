import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale, type Locale } from "@/i18n/locales"
import { rateLimitMiddleware } from "@/lib/rate-limiter"
import { validateApiKey } from "@/lib/api-key"
import { requiresApiKeyPermission, checkApiKeyPermissions } from "@/lib/api-key"

const ADMIN_PATH_PREFIXES = ["/admin"]

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
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
  try {
    const pathname = request.nextUrl.pathname

    // Generate request ID for distributed tracing
    const requestId = request.headers.get("x-request-id") || generateRequestId()

    // Skip API routes - they have their own rate limiting
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.includes(".")
    ) {
      const response = NextResponse.next()
      response.headers.set("x-request-id", requestId)

      // API key authentication: validate Bearer token and set user context header
      const authHeader = request.headers.get("authorization")
      if (authHeader?.startsWith("Bearer ")) {
        const rawKey = authHeader.slice(7)
        const validated = await validateApiKey(rawKey)
        if (validated) {
          response.headers.set("x-api-user-id", validated.userId)
          response.headers.set("x-api-key-id", validated.key.id)

          // Enforce API key permissions (fail closed)
          const required = requiresApiKeyPermission(pathname)
          if (required !== null) {
            const permCheck = checkApiKeyPermissions(validated.key.permissions as Record<string, unknown>, required)
            if (!permCheck.allowed) {
              const forbidden = NextResponse.json(
                {
                  error: "Insufficient API key permissions",
                  required: permCheck.required,
                  missing: permCheck.missing,
                },
                { status: 403 }
              )
              forbidden.headers.set("x-request-id", requestId)
              return forbidden
            }
          }
        }
      } else {
        const response = NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 })
        return response
      }

      return response
    }

    // Apply general rate limiting to all routes
    const rateLimitResponse = await rateLimitMiddleware(request)
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse
    }

    // Rate limit auth pages (login, signup, etc.) - handled by general rate limiter
    if (pathname.startsWith(`/${defaultLocale}/auth/`) || pathname.startsWith("/auth/")) {
      // Auth rate limiting is now handled by the general rate limiter
    }

    if (isAdminPath(pathname)) {
      let supabase: any = null
      try {
        supabase = await createRouteClient()
      } catch {
        supabase = null
      }
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          const loginUrl = request.nextUrl.clone()
          loginUrl.pathname = `/${defaultLocale}/auth/login`
          loginUrl.searchParams.set("callbackUrl", pathname)
          const response = NextResponse.redirect(loginUrl)
          response.headers.set("x-request-id", requestId)
          return response
        }

        const role = await getCachedAdminRole(supabase, user.id)

        if (!role || !["admin"].includes(role)) {
          const redirectUrl = new URL("/dashboard", request.url)
          const searchParams = request.nextUrl.searchParams
          if (searchParams.toString()) {
            redirectUrl.search = searchParams.toString()
          }
          const response = NextResponse.redirect(redirectUrl)
          response.headers.set("x-request-id", requestId)
          return response
        }

        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("mfa_enabled")
          .eq("id", user.id)
          .single()
        if (adminProfile?.mfa_enabled && !pathname.startsWith("/auth/mfa")) {
          const mfaUrl = new URL(`/${defaultLocale}/auth/mfa/verify`, request.url)
          const response = NextResponse.redirect(mfaUrl)
          response.headers.set("x-request-id", requestId)
          return response
        }
      }
    }

    const protectedPrefixes = [
      "/dashboard", "/admin", "/editor", "/billing", "/conversion",
      "/documents", "/files", "/templates", "/security", "/settings", "/onboarding",
    ]
    const isProtectedRoute = protectedPrefixes.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    )
    const isAuthRoute = pathname.startsWith("/auth/") || pathname === "/auth"

    if (isProtectedRoute && !isAuthRoute) {
      let supabase: any = null
      try {
        supabase = await createRouteClient()
      } catch {
        supabase = null
      }
      if (!supabase) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = `/${defaultLocale}/auth/login`
        loginUrl.searchParams.set("callbackUrl", pathname)
        const response = NextResponse.redirect(loginUrl)
        response.headers.set("x-request-id", requestId)
        return response
      }
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = `/${defaultLocale}/auth/login`
        loginUrl.searchParams.set("callbackUrl", pathname)
        const response = NextResponse.redirect(loginUrl)
        response.headers.set("x-request-id", requestId)
        return response
      }

      if (!user.email_confirmed_at && !pathname.startsWith("/auth/verify")) {
        const verifyUrl = new URL(`/${defaultLocale}/auth/verify`, request.url)
        const response = NextResponse.redirect(verifyUrl)
        response.headers.set("x-request-id", requestId)
        return response
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("mfa_enabled")
        .eq("id", user.id)
        .single()
      if (profile?.mfa_enabled && !pathname.startsWith("/auth/mfa")) {
        const mfaUrl = new URL(`/${defaultLocale}/auth/mfa/verify`, request.url)
        const response = NextResponse.redirect(mfaUrl)
        response.headers.set("x-request-id", requestId)
        return response
      }
    }

    // Locale handling for non-API routes
    let locale: Locale = defaultLocale

    // Check cookie first
    const cookieLocale = request.cookies.get("locale")?.value
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      locale = cookieLocale as Locale
    } else {
      // Check Accept-Language header
      const acceptLanguage = request.headers.get("accept-language")
      if (acceptLanguage) {
        const preferred = acceptLanguage
          .split(",")
          .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
          .find((l) => locales.includes(l as Locale))
        if (preferred) {
          locale = preferred as Locale
        }
      }

      // Check user profile for saved language preference
      let supabase: any = null
      try {
        supabase = await createRouteClient()
      } catch {
        supabase = null
      }
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("language")
            .eq("id", user.id)
            .single()
          if (profile?.language && locales.includes(profile.language as Locale)) {
            locale = profile.language as Locale
          }
        }
      }
    }

    // Handle locale in URL
    const pathnameHasLocale = locales.some(
      (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`
    )

    if (!pathnameHasLocale) {
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${pathname}`
      const response = NextResponse.redirect(url)
      response.headers.set("x-request-id", requestId)
      response.cookies.set("locale", locale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "strict",
      })
      return response
    }

    const currentCookie = request.cookies.get("locale")?.value
    if (currentCookie !== locale) {
      const response = NextResponse.next()
      response.headers.set("x-request-id", requestId)
      response.cookies.set("locale", locale, {
        path: "/",
        maxAge: 31536000,
        sameSite: "strict",
      })
      return response
    }

    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    return response
  } catch {
    // If any middleware error occurs, pass through to avoid crashing the request
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}