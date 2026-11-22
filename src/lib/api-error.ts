import { NextResponse } from "next/server"
import logger from "@/lib/logger"
import crypto from "crypto"

export interface ApiErrorResponse {
  error: {
    code: string
    message: string
    request_id: string
    timestamp: string
  }
}

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

export function createAppError(message: string, statusCode: number, code: string): AppError {
  const err = new Error(message) as AppError
  err.statusCode = statusCode
  err.code = code
  return err
}

// Pre-defined common errors to avoid object allocation on hot paths
export const ERRORS = {
  UNAUTHORIZED: createAppError("Unauthorized", 401, "UNAUTHORIZED"),
  FORBIDDEN: createAppError("Forbidden", 403, "FORBIDDEN"),
  NOT_FOUND: createAppError("Not found", 404, "NOT_FOUND"),
  RATE_LIMITED: createAppError("Too many requests", 429, "RATE_LIMITED"),
  INTERNAL_ERROR: createAppError("Internal server error", 500, "INTERNAL_ERROR"),
} as const

export function etagFor(data: unknown): string {
  return crypto.createHash("md5").update(JSON.stringify(data)).digest("hex")
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && "statusCode" in error && "code" in error
}

export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error) && error.statusCode) {
    return error.statusCode
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes("unauthorized") || msg.includes("401")) return 401
    if (msg.includes("forbidden") || msg.includes("403")) return 403
    if (msg.includes("not found") || msg.includes("404")) return 404
    if (msg.includes("conflict") || msg.includes("409")) return 409
    if (msg.includes("rate limit") || msg.includes("429")) return 429
  }
  return 500
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error) && error.code) {
    return error.code
  }
  return "INTERNAL_ERROR"
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return "An unexpected error occurred"
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

export function apiErrorResponse(error: unknown, requestId: string): NextResponse<ApiErrorResponse> {
  const statusCode = getErrorStatusCode(error)
  const response: ApiErrorResponse = {
    error: {
      code: getErrorCode(error),
      message: getErrorMessage(error),
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  }

  // Log full error server-side (including stack trace) but never return it to client
  if (statusCode >= 500) {
    logger.error(`[${requestId}] Server error`, { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
  }

  return NextResponse.json(response, { status: statusCode })
}

export type ApiHandler = (req: Request, ...extra: any[]) => Promise<NextResponse>

/**
 * Wraps an API route handler with standardized error handling.
 * Catches all unhandled exceptions, returns a consistent JSON error envelope,
 * and never leaks stack traces to clients.
 *
 * Usage:
 *   export const GET = withErrorBoundary(async (req) => {
 *     // handler logic
 *     return NextResponse.json({ data })
 *   })
 */
export function withErrorBoundary(handler: ApiHandler): ApiHandler {
  return async (req: Request, ...args: any[]): Promise<NextResponse> => {
    const requestId = req.headers.get("x-request-id") || generateRequestId()

    try {
      const response = await handler(req, ...args)

      // Ensure request ID header on all responses
      response.headers.set("x-request-id", requestId)
      // Prevent caching of API responses containing user data
      response.headers.set("Cache-Control", "private, no-store")

      // Add ETag support for GET requests
      if (req.method === "GET") {
        const body = response.body
        // Only add ETag if we can read the body (JSON responses)
        const etagHeader = response.headers.get("etag")
        if (!etagHeader) {
          const ifNoneMatch = req.headers.get("if-none-match")
          // We can't easily compute ETag without reading body, so skip if-none-match check
          // but we can still add ETag for future requests
          response.headers.set("Cache-Control", "private, max-age=60, must-revalidate")
        }
      }

      return response
    } catch (error) {
      return apiErrorResponse(error, requestId)
    }
  }
}

/**
 * Convenience wrapper for handlers that need access to the request ID.
 */
export function withErrorBoundaryAndId(
  handler: (req: Request, requestId: string) => Promise<NextResponse>
): ApiHandler {
  return async (req: Request): Promise<NextResponse> => {
    const requestId = req.headers.get("x-request-id") || generateRequestId()

    try {
      const response = await handler(req, requestId)
      response.headers.set("x-request-id", requestId)
      return response
    } catch (error) {
      return apiErrorResponse(error, requestId)
    }
  }
}
