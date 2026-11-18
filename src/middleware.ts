import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

    // Skip all non-page routes
    if (
      pathname.startsWith("/api") ||
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
  matcher: ["/((?!api|_next|_vercel|_not-found|.*\\..*).*)"],
  runtime: "nodejs"
}