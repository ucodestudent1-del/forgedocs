import { NextResponse } from "next/server"
import { createRouteAuthClient } from "@/lib/supabase"
import { validateCSRF } from "@/lib/csrf"
import { createAppError } from "@/lib/api-error"
import logger from "@/lib/logger"
import { getGuestUserId, isGuestMode } from "@/lib/guest-session"

export interface AuthContext {
  user: { id: string; email: string; [key: string]: unknown }
  supabase: Awaited<ReturnType<typeof createRouteAuthClient>>
}

type AuthHandler = (req: Request, ctx: AuthContext, ...extra: any[]) => Promise<NextResponse>

export interface WithAuthOptions {
  /** Require CSRF token for mutating methods (default: true) */
  requireCsrf?: boolean
  /** Methods that require CSRF (default: POST, PUT, PATCH, DELETE) */
  csrfMethods?: Set<string>
  /** Allow unauthenticated access (default: false) */
  optional?: boolean
  /** Specific GET paths that mutate state and require CSRF */
  csrfOnGet?: string[]
}

// Known GET endpoints that mutate state and require CSRF protection
// OAuth callback is NOT here - it uses Supabase's PKCE/state parameter for CSRF protection
const MUTATING_GET_PATHS = new Set([
  "/api/webhooks/verify",
  "/api/stripe/webhook",
])

/**
 * Higher-order wrapper that standardizes authentication across API routes.
 * 1. Resolves the authenticated user via Supabase
 * 2. Optionally validates CSRF for mutating methods
 * 3. Injects { user, supabase } into the handler
 *
 * Usage:
 *   export const POST = withAuth(async (req, { user, supabase }) => {
 *     // user and supabase are already resolved
 *   }, { requireCsrf: true })
 */
export function withAuth(
  handler: AuthHandler,
  options: WithAuthOptions = {}
) {
  const { requireCsrf = true, optional = false, csrfMethods, csrfOnGet } = options
  const methodsRequiringCsrf = csrfMethods ?? new Set(["POST", "PUT", "PATCH", "DELETE"])
  const getPathsRequiringCsrf = csrfOnGet ? new Set(csrfOnGet) : MUTATING_GET_PATHS

  return async (req: Request, ...args: any[]): Promise<NextResponse> => {
    const supabase = await createRouteAuthClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    let effectiveUser = user

    if (!user) {
      if (isGuestMode()) {
        effectiveUser = {
          id: getGuestUserId(),
          email: null,
        } as any
      } else if (!optional) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    // Validate CSRF for mutating methods and specific GET paths
    const url = new URL(req.url)
    const needsCsrf = methodsRequiringCsrf.has(req.method) || 
      (req.method === "GET" && getPathsRequiringCsrf.has(url.pathname))
    
    if (requireCsrf && needsCsrf) {
      try {
        await validateCSRF(req)
      } catch {
        return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
      }
    }

    const ctx: AuthContext = {
      user: {
        id: effectiveUser.id,
        email: effectiveUser.email,
        ...(user?.user_metadata ?? {}),
      },
      supabase,
    }

    try {
      return await handler(req, ctx, ...args)
    } catch (err) {
      logger.error("withAuth handler error", {
        error: err instanceof Error ? err.message : String(err),
        userId: effectiveUser?.id ?? null,
      })
      throw err
    }
  }
}
