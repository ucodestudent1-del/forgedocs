import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

let cachedClient: ReturnType<typeof createServerClient> | null = null

export async function createRouteClient() {
  if (!cachedClient) {
    const cookieStore = await cookies()
    cachedClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      },
    )
  }
  return cachedClient
}

export async function getRouteClient() {
  return createRouteClient()
}
