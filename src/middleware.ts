import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { validateApiKey } from "@/lib/api-key"
import { checkApiKeyPermissions } from "@/lib/api-key"
import { requiresApiKeyPermission } from "@/lib/api-key"
import { getRateLimitConfig, checkRateLimit } from "@/lib/rate-limiter"
import { getClientIdentifier } from "@/lib/client-identifier"

function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export async function middleware(request: NextRequest) {
  try {
    const pathname = request.nextUrl?.pathname ?? "/"

    // Generate request ID for distributed tracing
    const requestId = request.headers?.get?.("x-request-id") ?? generateRequestId()

    // API key authentication + rate limiting for /api/* routes
    if (pathname.startsWith("/api")) {
      const apiKey = request.headers.get("x-api-key")
      const isApiKey = !!apiKey

      if (isApiKey) {
        const keyInfo = await validateApiKey(apiKey)
        if (!keyInfo) {
          return NextResponse.json({ error: "Invalid or revoked API key" }, { status: 401 })
        }

        // Check API key permissions
        const requiredPermissions = requiresApiKeyPermission(pathname)
        if (requiredPermissions !== null && requiredPermissions.length > 0) {
          const permCheck = checkApiKeyPermissions(keyInfo.key.permissions, requiredPermissions)
          if (!permCheck.allowed) {
            return NextResponse.json(
              { error: "Insufficient API key permissions", missing: permCheck.missing },
              { status: 403 }
            )
          }
        }

        // Per-key rate limiting
        const config = getRateLimitConfig(pathname, true)
        if (config) {
          const identifier = `apikey:${keyInfo.key.id}`
          const limitInfo = await checkRateLimit(identifier, config)
          if (limitInfo.limited) {
            return NextResponse.json(
              { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
              { status: 429 }
            )
          }
        }

        // Set user ID and key ID headers for downstream route handlers
        const response = NextResponse.next()
        response.headers.set("x-request-id", requestId)
        response.headers.set("x-api-user-id", keyInfo.userId)
        response.headers.set("x-api-key-id", keyInfo.key.id)
        return response
      }

      // IP-based rate limiting for non-API-key requests
      const config = getRateLimitConfig(pathname, false)
      if (config) {
        const identifier = getClientIdentifier(request)
        const limitInfo = await checkRateLimit(identifier, config)
        if (limitInfo.limited) {
          return NextResponse.json(
            { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
            { status: 429 }
          )
        }
      }
    }

    // Skip all non-page routes
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.includes(".")
    ) {
      const response = NextResponse.next()
      response.headers.set("x-request-id", requestId)
      return response
    }

    const response = NextResponse.next()
    response.headers.set("x-request-id", "req-" + Date.now())
    return response
  } catch {
    // Never crash the middleware
    return NextResponse.next()
  }
}

export const config = {
  matcher: ["/((?!_next|_vercel|_not-found|.*\\..*).*)"],
  runtime: "nodejs"
}
