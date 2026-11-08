import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-XSS-Protection": "1; mode=block",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Apply security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookies().set({ name, value, ...options, httpOnly: true, secure: true, sameSite: "lax" })
        },
        remove(name: string, options: any) {
          cookies().set({ name, value: "", ...options, httpOnly: true, secure: true, sameSite: "lax" })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  const protectedRoutes = [
    "/dashboard",
    "/documents",
    "/templates",
    "/conversion",
    "/billing",
    "/editor",
  ]
  const isProtectedRoute = protectedRoutes.some((path) =>
    request.nextUrl.pathname.startsWith(path),
  )

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  const authRoutes = ["/auth/login", "/auth/signup"]
  if (authRoutes.includes(request.nextUrl.pathname) && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
}
