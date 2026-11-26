import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import crypto from "crypto"
import { validateEnv } from "@/lib/env"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
} from "@/lib/api-version"
import { validateApiKey, checkApiKeyPermissions, requiresApiKeyPermission } from "@/lib/api-key"
import { checkRateLimit, getRateLimitConfig, getAPIKeyRateLimitConfig } from "@/lib/rate-limiter"
import { getPooledRouteClient } from "@/lib/supabase"
import logger from "@/lib/logger"

let envValidated = false

async function ensureEnvValidated(): Promise<void> {
  if (envValidated) return
  try {
    await validateEnv()
    envValidated = true
  } catch (err) {
    logger.error("Environment validation failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    // Don't block the request — server.js already validates at startup.
    // This is a defense-in-depth check for middleware-only deployments.
    envValidated = true
  }
}

function generateCspNonce(): string {
  return crypto.randomBytes(16).toString("base64")
}

function buildCspHeader(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ")
}

function buildCspReportOnlyHeader(): string {
  return [
    "default-src 'self'",
    "script-src 'self' https:",
    "style-src 'self' https:",
    "img-src 'self' data: https:",
    "font-src 'self' https:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "report-uri /api/csp-report",
  ].join("; ")
}

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function middleware(request: NextRequest) {
  await ensureEnvValidated()
  const requestId = request.headers.get("x-request-id") ?? generateRequestId()
  const cspNonce = generateCspNonce()
  try {
    const pathname = request.nextUrl?.pathname ?? "/"

    // REDIRECT LOOP PROTECTION — detect and break infinite redirect cycles
    // Cookies are used instead of headers because browsers forward cookies
    // (but not custom headers) across redirects.
    const redirectCountCookie = request.cookies.get("redirect_count")
    const redirectCount = redirectCountCookie ? parseInt(redirectCountCookie.value, 10) : 0
    const isLooping = redirectCount > 3
    if (isLooping) {
      logger.error("Redirect loop detected, breaking cycle", {
        url: request.url,
        count: redirectCount,
      })
    }

    // Skip non-page routes (static assets, internals, RSC payloads)
    const isStaticRoute =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.startsWith("/_rsc") ||
      pathname.includes(".")

    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)
    response.headers.set("x-csp-nonce", cspNonce)

    // Skip auth callback route — handled by route handler directly
    if (pathname === "/auth/callback") {
      return response
    }

    if (isStaticRoute) {
      return response
    }

    // ---- Body size limit for all POST/PUT/PATCH requests ----
    if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
      const contentLength = request.headers.get("content-length")
      if (contentLength) {
        const size = parseInt(contentLength, 10)
        if (size > 10 * 1024 * 1024) { // 10MB max request body
          return NextResponse.json(
            { error: "Request body too large" },
            { status: 413 }
          )
        }
      }
    }

    // ---- Authentication check for page routes ----
    if (!pathname.startsWith("/api/") && !pathname.startsWith("/auth/")) {
      const supabase = await getPooledRouteClient()
      const { data: { user }, error } = await supabase.auth.getUser()

      // Protected routes that require authentication
      const protectedRoutes = [
        "/dashboard",
        "/editor",
        "/billing",
        "/settings",
      ]

      const isProtectedRoute = protectedRoutes.some(route =>
        pathname === route || pathname.startsWith(route + "/")
      )

      if (isProtectedRoute && (!user || error) && !isLooping) {
        const loginUrl = new URL("/auth/login", request.nextUrl)
        loginUrl.searchParams.set("callbackUrl", pathname)
        const redirectResponse = NextResponse.redirect(loginUrl)
        redirectResponse.cookies.set("redirect_count", String(redirectCount + 1), {
          path: "/",
          maxAge: 60,
        })
        return redirectResponse
      }

      // Enforce email verification on protected routes.
      // Unverified users are sent to the verification page instead of the app.
      if (
        isProtectedRoute &&
        user &&
        !error &&
        !user.email_confirmed_at &&
        !isLooping
      ) {
        const verifyUrl = new URL("/auth/verify", request.nextUrl)
        verifyUrl.searchParams.set("callbackUrl", pathname)
        const redirectResponse = NextResponse.redirect(verifyUrl)
        redirectResponse.cookies.set("redirect_count", String(redirectCount + 1), {
          path: "/",
          maxAge: 60,
        })
        return redirectResponse
      }
    }

    // Redirect authenticated users away from auth pages.
    // Fully verified users go to the dashboard; unverified users stay on auth
    // pages so they can complete verification / request a new code.
    if (pathname.startsWith("/auth/") && !isLooping && !pathname.startsWith("/auth/callback")) {
      const supabase = await getPooledRouteClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error) {
        if (user.email_confirmed_at) {
          const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.nextUrl))
          redirectResponse.cookies.set("redirect_count", String(redirectCount + 1), {
            path: "/",
            maxAge: 60,
          })
          return redirectResponse
        }
        if (!pathname.startsWith("/auth/verify") && !pathname.startsWith("/auth/login") && !pathname.startsWith("/auth/resend-verification")) {
          const redirectResponse = NextResponse.redirect(new URL("/auth/verify", request.nextUrl))
          redirectResponse.cookies.set("redirect_count", String(redirectCount + 1), {
            path: "/",
            maxAge: 60,
          })
          return redirectResponse
        }
      }
    }

    // Redirect authenticated users on the landing page to the dashboard.
    if (pathname === "/" && !isLooping) {
      const supabase = await getPooledRouteClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (user && !error && user.email_confirmed_at) {
        const redirectResponse = NextResponse.redirect(new URL("/dashboard", request.nextUrl))
        redirectResponse.cookies.set("redirect_count", String(redirectCount + 1), {
          path: "/",
          maxAge: 60,
        })
        return redirectResponse
      }
    }

    // ---- API key authentication & permission enforcement ----
    if (pathname.startsWith("/api/")) {
      const versionInfo = parseApiVersion(request.headers)

      // Warn clients when api-version header is missing (will be required in v2)
      const versionHeaderMissing = !request.headers.has("api-version")

      if (!SUPPORTED_API_VERSIONS.includes(versionInfo.version)) {
        const versionResponse = NextResponse.json(
          {
            error: `Unsupported API version: ${versionInfo.version}`,
            supported_versions: SUPPORTED_API_VERSIONS,
            default_version: DEFAULT_API_VERSION,
          },
          { status: 426 }
        )
        Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
          versionResponse.headers.set(key, value)
        })
        versionResponse.headers.set("x-request-id", requestId)
        versionResponse.headers.set("x-csp-nonce", cspNonce)
        versionResponse.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
        versionResponse.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
        versionResponse.headers.set("X-Content-Type-Options", "nosniff")
        versionResponse.headers.set("X-Frame-Options", "DENY")
        versionResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
        versionResponse.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
        return versionResponse
      }

      // Add version headers to all API responses
      Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      if (versionHeaderMissing) {
        response.headers.set("API-Version-Warning", "api-version header is required and will be enforced in API v2")
      }

      if (versionInfo.version !== DEFAULT_API_VERSION) {
        response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
      }

      // Set CSP header with nonce for API responses
      response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))

      // Add security headers to API responses
      response.headers.set("X-Content-Type-Options", "nosniff")
      response.headers.set("X-Frame-Options", "DENY")
      response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
      response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

      // Authenticate API key if present
      const apiKey = request.headers.get("x-api-key")
      if (apiKey) {
        const keyResult = await validateApiKey(apiKey)
        if (!keyResult) {
          const unauthorized = NextResponse.json(
            { error: "Invalid or revoked API key" },
            { status: 401 }
          )
          unauthorized.headers.set("x-request-id", requestId)
          unauthorized.headers.set("x-csp-nonce", cspNonce)
          unauthorized.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
          unauthorized.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
          unauthorized.headers.set("X-Content-Type-Options", "nosniff")
          unauthorized.headers.set("X-Frame-Options", "DENY")
          unauthorized.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
          unauthorized.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
          return unauthorized
        }

        // Set x-api-user-id for downstream rate limiting
        response.headers.set("x-api-user-id", keyResult.userId)

        // Enforce permissions
        const requiredPermissions = requiresApiKeyPermission(pathname)
        if (requiredPermissions !== null) {
          const permissionCheck = checkApiKeyPermissions(keyResult.key.permissions as Record<string, unknown>, requiredPermissions)
          if (!permissionCheck.allowed) {
            const forbidden = NextResponse.json(
              {
                error: "Insufficient API key permissions",
                required: permissionCheck.required,
                missing: permissionCheck.missing,
              },
              { status: 403 }
            )
            forbidden.headers.set("x-request-id", requestId)
            forbidden.headers.set("x-csp-nonce", cspNonce)
            forbidden.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
            forbidden.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
            forbidden.headers.set("X-Content-Type-Options", "nosniff")
            forbidden.headers.set("X-Frame-Options", "DENY")
            forbidden.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
            forbidden.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
            return forbidden
          }
        }

        // Per-key rate limiting — uses shared config from rate-limiter.ts
        const matchedConfig = getAPIKeyRateLimitConfig(pathname)

        if (matchedConfig) {
          const identifier = `apikey:${keyResult.key.id}`
          const limitInfo = await checkRateLimit(identifier, matchedConfig)
          if (limitInfo.limited) {
            const rateLimited = NextResponse.json(
              { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
              { status: 429 }
            )
            rateLimited.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
            rateLimited.headers.set("X-RateLimit-Remaining", "0")
            rateLimited.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
            rateLimited.headers.set("Retry-After", Math.ceil((limitInfo.resetTime - Date.now()) / 1000).toString())
            rateLimited.headers.set("x-request-id", requestId)
            rateLimited.headers.set("x-csp-nonce", cspNonce)
            rateLimited.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
            rateLimited.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
            rateLimited.headers.set("X-Content-Type-Options", "nosniff")
            rateLimited.headers.set("X-Frame-Options", "DENY")
            rateLimited.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
            rateLimited.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
            return rateLimited
          }
          response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
          response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
          response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
        }
      }

      return response
    }

    // Session-based rate limiting for API requests without API keys
    if (!request.headers.get("x-api-key")) {
      const matchedConfig = getRateLimitConfig(pathname)
      if (matchedConfig) {
        // Use a stable session identifier (cookie-based or IP-based) for rate limiting
        const sessionCookie = request.cookies.get("sb-session")?.value ?? requestId
        const identifier = `session:${sessionCookie}`
        const limitInfo = await checkRateLimit(identifier, matchedConfig)
        if (limitInfo.limited) {
          const rateLimited = NextResponse.json(
            { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
            { status: 429 }
          )
          rateLimited.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
          rateLimited.headers.set("X-RateLimit-Remaining", "0")
          rateLimited.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
          rateLimited.headers.set("Retry-After", Math.ceil((limitInfo.resetTime - Date.now()) / 1000).toString())
          rateLimited.headers.set("x-request-id", requestId)
          rateLimited.headers.set("x-csp-nonce", cspNonce)
          rateLimited.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
          rateLimited.headers.set("X-Content-Type-Options", "nosniff")
          rateLimited.headers.set("X-Frame-Options", "DENY")
          rateLimited.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
          rateLimited.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
          return rateLimited
        }
        response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
        response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
        response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
      }
    }

    response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
    response.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())

    // Add security headers
    response.headers.set("X-Content-Type-Options", "nosniff")
    response.headers.set("X-Frame-Options", "DENY")
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

    // Clear redirect_count cookie on successful page load to reset loop counter
    response.cookies.set("redirect_count", "", { path: "/", maxAge: 0 })

    return response
  } catch (error) {
    logger.error("Middleware error", {
      error: error instanceof Error ? error.message : String(error),
      requestId,
    })
    const response = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
    response.headers.set("x-request-id", requestId)
    response.headers.set("x-csp-nonce", cspNonce)
    response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
    response.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
    return response
  }
}

export const config = {
  matcher: ["/((?!_next|_vercel|_not-found|_rsc|.*\\..*).*)"],
  runtime: "nodejs"
}