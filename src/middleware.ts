import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
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
