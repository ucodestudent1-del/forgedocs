import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import crypto from "crypto"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
} from "@/lib/api-version"
import { validateApiKey, checkApiKeyPermissions, requiresApiKeyPermission } from "@/lib/api-key"
import { checkRateLimit, API_KEY_RATE_LIMIT_CONFIGS, type RateLimitConfig } from "@/lib/rate-limiter"

function generateCspNonce(): string {
  return crypto.randomUUID().replace(/-/g, "")
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
    const cspNonce = generateCspNonce()

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
        versionResponse.headers.set("x-csp-nonce", cspNonce)
        versionResponse.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
        return versionResponse
      }

      // Add version headers to all API responses
      Object.entries(apiVersionHeaders(versionInfo.version)).forEach(([key, value]) => {
        response.headers.set(key, value)
      })
      if (versionInfo.version !== DEFAULT_API_VERSION) {
        response.headers.set("API-Version-Default", DEFAULT_API_VERSION)
      }

      // Set CSP header with nonce for API responses
      response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))

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
            return forbidden
          }
        }

        // Per-key rate limiting — uses shared config from rate-limiter.ts
        let matchedConfig: RateLimitConfig | null = null
        let matchedPathLen = 0
        for (const [pathPattern, config] of Object.entries(API_KEY_RATE_LIMIT_CONFIGS)) {
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
            rateLimited.headers.set("x-csp-nonce", cspNonce)
            rateLimited.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))
            return rateLimited
          }
          response.headers.set("X-RateLimit-Limit", limitInfo.total.toString())
          response.headers.set("X-RateLimit-Remaining", limitInfo.remaining.toString())
          response.headers.set("X-RateLimit-Reset", Math.ceil(limitInfo.resetTime / 1000).toString())
        }
      }

      return response
    }

    // Set CSP header with nonce for page responses
    response.headers.set("Content-Security-Policy", buildCspHeader(cspNonce))

    return response
  } catch {
    const response = NextResponse.next()
    response.headers.set("x-request-id", generateRequestId())
    return response
  }
}

export const config = {
  matcher: ["/((?!_next|_vercel|_not-found|_rsc|.*\\..*).*)"],
  runtime: "nodejs"
}
