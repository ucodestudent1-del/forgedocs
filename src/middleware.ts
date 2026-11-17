import { createRouteClient } from "@/lib/supabase"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { locales, defaultLocale, type Locale } from "@/i18n/locales"
import { rateLimitMiddleware } from "@/lib/rate-limiter"
import {
  validateApiKey,
  checkApiKeyPermissions,
  requiresApiKeyPermission,
} from "@/lib/api-key"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
} from "@/lib/api-version"

const ADMIN_PATH_PREFIXES = ["/admin"]

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function addVersionHeaders(response: NextResponse, version: string): NextResponse {
  response.headers.set("API-Version", version)
  if (version !== DEFAULT_API_VERSION) {
    response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
  }
  return response
}

function unsupportedVersionResponse(version: string): NextResponse {
  const response = NextResponse.json(
    {
      error: `Unsupported API version: ${version}`,
      supported_versions: SUPPORTED_API_VERSIONS,
      default_version: DEFAULT_API_VERSION,
    },
    { status: 426 }
  )
  response.headers.set("API-Version", version)
  response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
  return response
}

function getLocale(request: NextRequest): string {
  const pathname = request.nextUrl.pathname

  const pathnameLocale = locales.find(
    (l) => pathname.startsWith(`/${l}/`) || pathname === `/${l}`
  )
  if (pathnameLocale) {
    return pathnameLocale
  }

  const cookieLocale = request.cookies.get("locale")?.value
    if (cookieLocale && locales.includes(cookieLocale as Locale)) {
      return cookieLocale
    }

  const acceptLanguage = request.headers.get("accept-language")
  if (acceptLanguage) {
    const preferred = acceptLanguage
      .split(",")
      .map((l) => l.split(";")[0].trim().toLowerCase().split("-")[0])
      .find((l) => locales.includes(l as Locale))
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

    if (profile?.language && locales.includes(profile.language)) {
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

  // Generate request ID for distributed tracing
  const requestId = request.headers.get("x-request-id") || generateRequestId()

  // API versioning: validate api-version header on every request.
  // Unsupported versions get 426 Upgrade Required immediately.
  const versionInfo = parseApiVersion(request.headers)
  if (!SUPPORTED_API_VERSIONS.includes(versionInfo.version)) {
    return unsupportedVersionResponse(versionInfo.version)
  }

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
    response.headers.set("API-Version", versionInfo.version)
    if (versionInfo.version !== DEFAULT_API_VERSION) {
      response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
    }

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
            forbidden.headers.set("API-Version", versionInfo.version)
            if (versionInfo.version !== DEFAULT_API_VERSION) {
              forbidden.headers.set("API-Version-Default", DEFAULT_API_VERSION)
            }
            return forbidden
          }
        }
      } else {
        const response = NextResponse.json({ error: "Invalid or expired API key" }, { status: 401 })
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
        return response
      }
    }

    return response
  }

  // Apply general rate limiting to all routes
  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse.status !== 200) {
    rateLimitResponse.headers.set("API-Version", versionInfo.version)
    if (versionInfo.version !== DEFAULT_API_VERSION) {
      rateLimitResponse.headers.set("API-Version-Default", DEFAULT_API_VERSION)
    }
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
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
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
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
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
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
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
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        const loginUrl = request.nextUrl.clone()
        loginUrl.pathname = `/${defaultLocale}/auth/login`
        loginUrl.searchParams.set("callbackUrl", pathname)
        const response = NextResponse.redirect(loginUrl)
        response.headers.set("x-request-id", requestId)
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
        return response
      }

      if (!user.email_confirmed_at && !pathname.startsWith("/auth/verify")) {
        const verifyUrl = new URL(`/${defaultLocale}/auth/verify`, request.url)
        const response = NextResponse.redirect(verifyUrl)
        response.headers.set("x-request-id", requestId)
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
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
        response.headers.set("API-Version", versionInfo.version)
        if (versionInfo.version !== DEFAULT_API_VERSION) {
          response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
        }
        return response
      }
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
      response.headers.set("x-request-id", requestId)
      response.headers.set("API-Version", versionInfo.version)
      if (versionInfo.version !== DEFAULT_API_VERSION) {
        response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
      }
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
    response.headers.set("x-request-id", requestId)
    response.headers.set("API-Version", versionInfo.version)
    if (versionInfo.version !== DEFAULT_API_VERSION) {
      response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
    }
    response.cookies.set("locale", locale, {
      path: "/",
      maxAge: 31536000,
      sameSite: "strict",
    })
    return response
  }

  const response = NextResponse.next()
  response.headers.set("x-request-id", requestId)
  response.headers.set("API-Version", versionInfo.version)
  if (versionInfo.version !== DEFAULT_API_VERSION) {
    response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
  }
  return response
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
}
