import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
} from "@/lib/api-version"
import { validateApiKey, checkApiKeyPermissions, requiresApiKeyPermission } from "@/lib/api-key"
import { checkRateLimit } from "@/lib/rate-limiter"

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl?.pathname ?? "/"
    const requestId = request.headers.get("x-request-id") ?? generateRequestId()

    // Skip non-page routes (static assets, internals, RSC payloads)
    const isStaticRoute =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.startsWith("/_rsc") ||
      pathname.includes(".")

    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)

    if (isStaticRoute) {
      return response
    }

    // ---- API key authentication & permission enforcement ----
    if (pathname.startsWith("/api/")) {
      const versionInfo = parseApiVersion(request.headers)

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
        return versionResponse
      }

      // Add version headers to all API responses
      Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      if (versionInfo.version !== DEFAULT_API_VERSION) {
        response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
      }

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
            return forbidden
          }
        }

        // Per-key rate limiting
        const rateLimitConfigs: Record<string, { windowMs: number; maxRequests: number; keyPrefix: string }> = {
          "/api/documents": { windowMs: 60 * 1000, maxRequests: 2000, keyPrefix: "apikey:docs" },
          "/api/conversion": { windowMs: 60 * 1000, maxRequests: 600, keyPrefix: "apikey:conversion" },
          "/api/pdf-tools/process": { windowMs: 60 * 1000, maxRequests: 200, keyPrefix: "apikey:pdf" },
          "/api/ai/assistant": { windowMs: 60 * 1000, maxRequests: 400, keyPrefix: "apikey:ai" },
          "/api/ai/chat": { windowMs: 60 * 1000, maxRequests: 600, keyPrefix: "apikey:ai-chat" },
          "/api/e-signatures/send": { windowMs: 60 * 1000, maxRequests: 100, keyPrefix: "apikey:esign" },
          "/api/templates": { windowMs: 60 * 1000, maxRequests: 1000, keyPrefix: "apikey:templates" },
          "/api/auth/login": { windowMs: 15 * 60 * 1000, maxRequests: 200, keyPrefix: "apikey:login" },
          "/api/auth/signup": { windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: "apikey:signup" },
          "/api/auth/forgot-password": { windowMs: 60 * 60 * 1000, maxRequests: 50, keyPrefix: "apikey:forgot" },
          "/api/auth/reset-password": { windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: "apikey:reset" },
          "/api/auth/mfa/verify": { windowMs: 5 * 60 * 1000, maxRequests: 200, keyPrefix: "apikey:mfa" },
          "/api/contact": { windowMs: 15 * 60 * 1000, maxRequests: 100, keyPrefix: "apikey:contact" },
        }

        let matchedConfig: { windowMs: number; maxRequests: number; keyPrefix: string } | null = null
        let matchedPathLen = 0
        for (const [pathPattern, config] of Object.entries(rateLimitConfigs)) {
          if (pathname.startsWith(pathPattern) && pathPattern.length > matchedPathLen) {
            matchedConfig = config
            matchedPathLen = pathPattern.length
          }
        }

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
            return rateLimited
          }
          response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
          response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
          response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
        }
      }

      return response
    }

    return response
  } catch {
    const response = NextResponse.next()
    response.headers.set("x-request-id", generateRequestId())
    return response
  }
}

export const config = {
  matcher: ["/((?!_next|_vercel|_not-found|.*\\..*).*)"],
  runtime: "nodejs"
}
