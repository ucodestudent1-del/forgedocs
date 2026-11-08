import { createRouteClient } from "@supabase/ssr"
import { cookies } from "next/headers"

export { createRouteClient }

let cachedClient: ReturnType<typeof createRouteClient> | null = null

export function getRouteClient() {
  if (!cachedClient) {
    cachedClient = createRouteClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: () => cookies() },
    )
  }
  return cachedClient
}
