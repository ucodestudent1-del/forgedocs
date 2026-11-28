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
import { createRouteAuthClient } from "@/lib/supabase"
import logger from "@/lib/logger"
import { CONFIG } from "@/lib/constants"

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

// Type for middleware functions
type MiddlewareFn = (request: NextRequest, response: NextResponse) => Promise<NextResponse | void>

// ============================================================================
// Individual Middleware Functions
// ============================================================================

async function withCspNonce(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const cspNonce = generateCspNonce()
  response.headers.set("x-csp-nonce", cspNonce)
  response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
  response.headers.set("Content-Security-Policy-Report-Only", buildCspReportOnlyHeader())
  return response
}

async function withRedirectLoopProtection(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const redirectCount = parseInt(request.headers.get("x-redirect-count") || "0", 10)
  if (redirectCount > 10) {
    logger.warn("Redirect loop detected", { url: request.url, redirectCount })
    return NextResponse.redirect(new URL("/error?code=redirect_loop", request.url))
  }
  if (redirectCount > 0) {
    response.headers.set("x-redirect-count", String(redirectCount + 1))
  }
}

async function withBodySizeLimit(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const size = parseInt(contentLength, 10)
    if (size > CONFIG.bodySize.maxApiRequest) {
      return NextResponse.json(
        { error: "Request body too large" },
        { status: 413 }
      )
    }
  }
}

async function withPageAuthRedirects(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const pathname = request.nextUrl.pathname
  const isProtectedPage = CONFIG.auth.protectedRoutes.some((route) => pathname.startsWith(route))
  
  if (isProtectedPage) {
    const supabase = await createRouteAuthClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("redirect", pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
}

async function withApiVersioning(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  const { version, isDeprecated } = parseApiVersion(request)
  Object.entries(apiVersionHeaders(version)).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  if (isDeprecated) {
    response.headers.set("Sunset", "Sat, 01 Jan 2026 00:00:00 GMT")
    response.headers.set("Deprecation", "true")
  }
  return response
}

async function withApiKeyAuth(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const apiKey = request.headers.get("x-api-key")
  if (!apiKey) return

  const validation = await validateApiKey(apiKey)
  if (!validation) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    )
  }

  response.headers.set("x-api-user-id", validation.userId)
}

async function withPermissionEnforcement(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const pathname = request.nextUrl.pathname
  const requiredPermission = requiresApiKeyPermission(pathname)
  
  if (!requiredPermission) return

  const apiKey = request.headers.get("x-api-key")
  if (!apiKey) {
    return NextResponse.json(
      { error: "API key required" },
      { status: 401 }
    )
  }

  const hasPermission = await checkApiKeyPermissions(apiKey, requiredPermission)
  if (!hasPermission) {
    return NextResponse.json(
      { error: `Insufficient permissions: ${requiredPermission} required` },
      { status: 403 }
    )
  }
}

async function withRateLimiting(request: NextRequest, response: NextResponse): Promise<NextResponse | void> {
  const pathname = request.nextUrl.pathname
  const isApiKey = request.headers.has("x-api-key")
  
  const config = isApiKey 
    ? getAPIKeyRateLimitConfig(pathname)
    : getRateLimitConfig(pathname)
  
  if (!config) return

  const identifier = isApiKey 
    ? `apikey:${request.headers.get("x-api-key")?.slice(0, 8)}`
    : request.headers.get("x-forwarded-for") || request.ip || "anonymous"

  const rateLimitInfo = await checkRateLimit(identifier, config, pathname)
  
  response.headers.set("X-RateLimit-Limit", String(rateLimitInfo.total))
  response.headers.set("X-RateLimit-Remaining", String(rateLimitInfo.remaining))
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(rateLimitInfo.resetTime / 1000)))

  if (rateLimitInfo.limited) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfter: Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000) },
      { status: 429 }
    )
  }
}

async function withSecurityHeaders(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  Object.entries(CONFIG.security.headers).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

async function withErrorHandling(request: NextRequest, response: NextResponse): Promise<NextResponse> {
  response.headers.set("x-request-id", request.headers.get("x-request-id") || generateRequestId())
  response.headers.set("Cache-Control", "private, no-store")
  return response
}

// ============================================================================
// Middleware Pipeline
// ============================================================================

const middlewarePipeline: MiddlewareFn[] = [
  withCspNonce,
  withRedirectLoopProtection,
  withBodySizeLimit,
  withPageAuthRedirects,
  withApiVersioning,
  withApiKeyAuth,
  withPermissionEnforcement,
  withRateLimiting,
  withSecurityHeaders,
  withErrorHandling,
]

export async function middleware(request: NextRequest) {
  await ensureEnvValidated()
  const requestId = request.headers.get("x-request-id") ?? generateRequestId()
  
  let response = NextResponse.next()
  response.headers.set("x-request-id", requestId)

  for (const mw of middlewarePipeline) {
    const result = await mw(request, response)
    if (result instanceof NextResponse) {
      return result
    }
    if (result) {
      response = result
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}