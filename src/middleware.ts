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
