import { NextResponse } from "next/server"
import { getRouteClient } from "@/lib/supabase"
import { validateCSRF } from "@/lib/csrf"
import { createAppError } from "@/lib/api-error"
import logger from "@/lib/logger"
import { isGuestMode, getGuestUserId } from "@/lib/guest-session"

export interface AuthContext {
  user: { id: string; email: string; [key: string]: unknown }
  supabase: Awaited<ReturnType<typeof getRouteClient>>
}

type AuthHandler = (req: Request, ctx: AuthContext, ...extra: any[]) => Promise<NextResponse>

export interface WithAuthOptions {
  /** Require CSRF token for mutating methods (default: true) */
  requireCsrf?: boolean
  /** Methods that require CSRF (default: POST, PUT, PATCH, DELETE) */
  csrfMethods?: Set<string>
  /** Allow unauthenticated access (default: false) */
  optional?: boolean
}

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
  const { requireCsrf = true, optional = false, csrfMethods } = options
  const methodsRequiringCsrf = csrfMethods ?? new Set(["POST", "PUT", "PATCH", "DELETE"])

  return async (req: Request, ...args: any[]): Promise<NextResponse> => {
    const supabase = await getRouteClient()

    const { data: { user }, error } = await supabase.auth.getUser()

    let effectiveUser = user

    if ((error || !user) && isGuestMode()) {
      effectiveUser = {
        id: getGuestUserId(),
        email: null,
      } as any
    }

    if ((error || !user) && !isGuestMode()) {
      if (optional) {
        return handler(req, { user: null as any, supabase }, ...args)
      }
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Validate CSRF for mutating methods
    if (requireCsrf && methodsRequiringCsrf.has(req.method)) {
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
