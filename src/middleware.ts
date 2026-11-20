import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  parseApiVersion,
  apiVersionHeaders,
  SUPPORTED_API_VERSIONS,
  DEFAULT_API_VERSION,
} from "@/lib/api-version"

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

    // Skip non-page routes (static assets, internals)
    const isStaticRoute =
      pathname.startsWith("/_next") ||
      pathname.startsWith("/_vercel") ||
      pathname.startsWith("/_not-found") ||
      pathname.includes(".")

    const response = NextResponse.next()
    response.headers.set("x-request-id", requestId)

    if (isStaticRoute) {
      return response
    }

    // Enforce API versioning on all /api/* routes
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
